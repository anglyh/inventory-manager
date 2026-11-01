import z from 'zod';
import { paymentMethodSchema } from './inventory-movement.schema.js';

const money = z.number('Importe requerido').nonnegative('No puede ser negativo').max(99999999.99, 'Importe fuera de rango')
  .multipleOf(0.01, 'Importe debe tener como máximo 2 decimales')
  // zod-to-openapi does not emit Zod's multipleOf check, so it is documented explicitly.
  .meta({ multipleOf: 0.01 });

export const documentTypeSchema = z.enum(['DNI', 'CE', 'PASSPORT', 'PTP', 'OTHER']).meta({ id: 'DocumentType' });
export const rateKindSchema = z.enum(['HOURLY', 'NIGHT']).meta({ id: 'RateKind' });
export const guardianRelationSchema = z.enum(['PARENT', 'TUTOR', 'RESPONSIBLE']).meta({ id: 'GuardianRelation' });
export const stayChargeKindSchema = z.enum(['RATE', 'EXTRA_HOURS', 'OTHER']).meta({ id: 'StayChargeKind' });
const sexSchema = z.enum(['M', 'F']);

const documentNumber = z.string().trim().min(1, 'El número de documento es obligatorio').max(20);
const fullName = z.string().trim().min(1, 'El nombre es obligatorio').max(120);
const birthDate = z.iso.date('Fecha inválida, use AAAA-MM-DD');
const optionalText = (max: number) => z.string().trim().max(max).optional();

// --- Requests ------------------------------------------------------------------

export const guestLookupSchema = z.object({
  documentType: documentTypeSchema,
  documentNumber,
}).strict();

const stayGuestSchema = z.object({
  documentType: documentTypeSchema,
  documentNumber: documentNumber.meta({ example: '45781236' }),
  fullName: fullName.meta({ example: 'Juan Pérez Rojas' }),
  birthDate: birthDate.meta({ example: '1990-05-14' }),
  sex: sexSchema,
  nationality: z.string().trim().min(1, 'La nacionalidad es obligatoria').max(60).meta({ example: 'Peruana' }),
  residence: z.string().trim().min(1, 'La procedencia es obligatoria').max(120).meta({ example: 'Arequipa' }),
  phone: z.string().trim().max(20).nullable().optional(),
  isHolder: z.boolean().meta({ description: 'Exactamente un huésped es el titular de la estadía.' }),
});

const stayMinorSchema = z.object({
  fullName,
  documentType: documentTypeSchema.nullable().optional(),
  documentNumber: documentNumber.nullable().optional(),
  birthDate,
  guardianRelation: guardianRelationSchema,
  accreditation: z.string().trim().max(500).nullable().optional()
    .meta({ description: 'Documento que acredita la relación (p. ej. partida de nacimiento o autorización notarial).' }),
});

const paymentSchema = z.object({
  paymentMethod: paymentMethodSchema,
  amount: money.positive('Debe ser mayor a 0').meta({ example: 50 }),
});

export const MAX_STAY_HOURS = 48;

export const checkInSchema = z.object({
  roomId: z.uuid('ID de habitación inválido'),
  rateKind: rateKindSchema,
  hours: z.number('Indique las horas').int('Debe ser un número entero').min(1, 'Mínimo 1 hora')
    .max(MAX_STAY_HOURS, `Máximo ${MAX_STAY_HOURS} horas`).optional()
    .meta({ description: 'Horas contratadas. Obligatorio en tarifa por horas; no se envía en tarifa por noche.', example: 3 }),
  amount: money.meta({
    description: 'Tarifa cobrada. La de referencia (horas × precio por hora, o precio por noche) se guarda aparte.',
    example: 30,
  }),
  expectedCheckOut: z.iso.datetime({ offset: true }).optional()
    .meta({ description: 'Salida prevista. Si se omite, se usa la sugerida (por horas: ingreso + horas; noche: día siguiente a la hora de salida).' }),
  travelReason: optionalText(200).meta({ example: 'Turismo' }),
  notes: optionalText(500),
  guests: z.array(stayGuestSchema).min(1, 'Debe registrar al menos un huésped'),
  minors: z.array(stayMinorSchema).optional(),
  paymentMethod: paymentMethodSchema.meta({ description: 'Medio de pago. La tarifa se cobra completa al ingresar; requiere una caja abierta.' }),
}).strict().superRefine((body, ctx) => {
  if (body.rateKind === 'HOURLY' && body.hours === undefined) {
    ctx.addIssue({ code: 'custom', message: 'Indique cuántas horas se queda', path: ['hours'] });
  }
  if (body.rateKind === 'NIGHT' && body.hours !== undefined) {
    ctx.addIssue({ code: 'custom', message: 'Las horas solo se indican en la tarifa por horas', path: ['hours'] });
  }
}).meta({ id: 'CheckIn' });

export const stayChargeSchema = z.object({
  kind: z.enum(['EXTRA_HOURS', 'OTHER']),
  description: z.string().trim().min(1, 'La descripción es obligatoria').max(200).meta({ example: 'Lavandería' }),
  suggestedAmount: money.nullable().optional(),
  amount: money.positive('Debe ser mayor a 0').meta({ example: 10 }),
}).strict().meta({ id: 'CreateStayCharge' });

export const stayPaymentSchema = paymentSchema.strict().meta({ id: 'CreateStayPayment' });

export const checkOutSchema = z.object({
  extraAmount: money.optional().meta({
    description: 'Adicional cobrado por salir tarde. Si se omite se usa el sugerido por el servidor; 0 lo condona. Se guarda junto al sugerido.',
    example: 20,
  }),
  payment: paymentSchema.optional().meta({ description: 'Cobro del saldo en el mismo paso; requiere una caja abierta.' }),
}).strict().meta({ id: 'CheckOut' });

export const stayMigrationsSchema = z.object({
  reported: z.boolean(),
}).strict().meta({ id: 'StayMigrations' });

export const stayIdSchema = z.object({ id: z.uuid('ID de estadía inválido') });

export const stayPaymentIdSchema = stayIdSchema.extend({ paymentId: z.uuid('ID de pago inválido') });

export const voidStayPaymentSchema = z.object({
  reason: z.string().trim().min(1, 'El motivo es obligatorio').max(500).meta({ example: 'Se digitó 500 en vez de 50' }),
}).strict().meta({ id: 'VoidStayPayment' });

export const stayListQuerySchema = z.object({
  from: z.coerce.date().optional().meta({ description: 'Ingresos desde esta fecha (inclusive).' }),
  to: z.coerce.date().optional().meta({ description: 'Ingresos antes de esta fecha (exclusivo).' }),
  roomId: z.uuid('ID de habitación inválido').optional(),
  migrations: z.enum(['pending']).optional().meta({
    description: 'pending: solo estadías con huéspedes extranjeros que aún no se reportaron a Migraciones.',
  }),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export type CheckInDTO = z.infer<typeof checkInSchema>;
export type StayGuestDTO = z.infer<typeof stayGuestSchema>;
export type StayMinorDTO = z.infer<typeof stayMinorSchema>;
export type StayChargeDTO = z.infer<typeof stayChargeSchema>;
export type StayPaymentDTO = z.infer<typeof stayPaymentSchema>;
export type CheckOutDTO = z.infer<typeof checkOutSchema>;
export type VoidStayPaymentDTO = z.infer<typeof voidStayPaymentSchema>;
export type StayListQueryDTO = z.infer<typeof stayListQuerySchema>;
export type GuestLookupDTO = z.infer<typeof guestLookupSchema>;

// --- Responses (NUMERIC amounts from PostgreSQL are serialized as strings) --------

const moneySchema = z.string().meta({ example: '50.00' });

export const guestResponseSchema = z.object({
  id: z.uuid(),
  documentType: documentTypeSchema,
  documentNumber: z.string(),
  fullName: z.string(),
  birthDate: z.iso.date(),
  sex: sexSchema,
  nationality: z.string(),
  residence: z.string(),
  phone: z.string().nullable(),
}).meta({ id: 'Guest' });

export const nullableGuestSchema = guestResponseSchema.nullable().meta({ id: 'NullableGuest' });

const stayGuestResponseSchema = guestResponseSchema.extend({ isHolder: z.boolean() });

const stayMinorResponseSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  documentType: documentTypeSchema.nullable(),
  documentNumber: z.string().nullable(),
  birthDate: z.iso.date(),
  guardianRelation: guardianRelationSchema,
  accreditation: z.string().nullable(),
});

const stayChargeResponseSchema = z.object({
  id: z.uuid(),
  kind: stayChargeKindSchema,
  description: z.string(),
  suggestedAmount: moneySchema.nullable(),
  amount: moneySchema,
  createdBy: z.uuid().nullable(),
  createdByName: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

const stayPaymentResponseSchema = z.object({
  id: z.uuid(),
  cashRegisterId: z.uuid(),
  paymentMethod: paymentMethodSchema,
  amount: moneySchema,
  createdBy: z.uuid().nullable(),
  createdByName: z.string().nullable(),
  createdAt: z.iso.datetime(),
  status: z.enum(['COMPLETED', 'VOIDED']).meta({ description: 'VOIDED: anulado; no suma al saldo, a la caja ni a los reportes.' }),
  voidedBy: z.uuid().nullable(),
  voidedByName: z.string().nullable(),
  voidedAt: z.iso.datetime().nullable(),
  voidReason: z.string().nullable(),
});

const stayBaseFields = {
  id: z.uuid(),
  status: z.enum(['ACTIVE', 'CLOSED']),
  roomId: z.uuid(),
  roomNumber: z.string(),
  roomTypeName: z.string(),
  rateKind: rateKindSchema,
  hours: z.number().int().nullable().meta({ description: 'Horas contratadas en tarifa por horas; null en tarifa por noche.' }),
  checkInAt: z.iso.datetime(),
  expectedCheckOut: z.iso.datetime(),
  actualCheckOut: z.iso.datetime().nullable(),
  travelReason: z.string().nullable(),
  notes: z.string().nullable(),
  migrationsReportedAt: z.iso.datetime().nullable(),
  hasForeignGuests: z.boolean().meta({ description: 'Algún huésped con CE, pasaporte o PTP: debe reportarse a Migraciones.' }),
  chargesTotal: moneySchema,
  paymentsTotal: moneySchema,
  balance: moneySchema,
  guests: z.array(stayGuestResponseSchema),
  minors: z.array(stayMinorResponseSchema),
};

export const stayListItemSchema = z.object(stayBaseFields).meta({ id: 'StayListItem' });

export const stayPageSchema = z.object({
  data: z.array(stayListItemSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
}).meta({ id: 'StayPage' });

export const stayDetailSchema = z.object({
  ...stayBaseFields,
  extraHourPrice: moneySchema,
  createdBy: z.uuid().nullable(),
  createdByName: z.string().nullable(),
  closedBy: z.uuid().nullable(),
  closedByName: z.string().nullable(),
  charges: z.array(stayChargeResponseSchema),
  payments: z.array(stayPaymentResponseSchema),
  suggestedExtra: z.object({
    overdueMinutes: z.number().int(),
    hours: z.number().int(),
    amount: moneySchema,
  }).nullable().meta({ description: 'Adicional sugerido al momento de la consulta; null si la estadía está cerrada.' }),
}).meta({ id: 'StayDetail' });
