import z from 'zod';

const money = z.number().nonnegative().max(99999999.99).multipleOf(0.01)
  // zod-to-openapi does not emit Zod's multipleOf check, so it is documented explicitly.
  .meta({ multipleOf: 0.01 });
const notes = z.string().trim().max(500).optional();

// Request bodies are named with .meta({ id }) so the OpenAPI document references them as components.
export const openCashRegisterSchema = z.object({
  openingAmount: money.meta({ example: 100 }),
  notes,
}).strict().meta({ id: 'OpenCashRegister' });
export const closeCashRegisterSchema = z.object({
  closingAmount: money.meta({ example: 245 }),
  notes: notes.meta({ description: 'Obligatorio y no vacío si existe diferencia con el efectivo esperado.', example: 'Faltan 5 soles' }),
}).strict().meta({ id: 'CloseCashRegister' });
export const cashMovementSchema = z.object({
  type: z.enum(['CASH_IN', 'CASH_OUT']).meta({ example: 'CASH_OUT' }),
  amount: money.positive().meta({ example: 20 }),
  reason: z.string().trim().min(1, 'El motivo es obligatorio').max(500).meta({ example: 'Dinero llevado al banco' }),
}).strict().meta({ id: 'CreateCashMovement' });
export const cashRegisterIdSchema = z.object({ id: z.uuid('ID de caja inválido') });

const registerPageFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
};
const movementPageFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
};
const currentMovementPageFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().positive().max(100).default(5),
};
export const cashRegisterHistorySchema = z.object({
  ...registerPageFields, status: z.enum(['OPEN', 'CLOSED']).optional(),
}).strict();
export const cashMovementHistorySchema = z.object(movementPageFields).strict();
export const currentCashMovementHistorySchema = z.object(currentMovementPageFields).strict();

export type OpenCashRegisterDTO = z.infer<typeof openCashRegisterSchema>;
export type CloseCashRegisterDTO = z.infer<typeof closeCashRegisterSchema>;
export type CashMovementDTO = z.infer<typeof cashMovementSchema>;
export type CashRegisterHistoryDTO = z.infer<typeof cashRegisterHistorySchema>;
export type CashMovementHistoryDTO = z.infer<typeof cashMovementHistorySchema>;
export type CurrentCashMovementHistoryDTO = z.infer<typeof currentCashMovementHistorySchema>;

// Response schemas. NUMERIC amounts from PostgreSQL are serialized as strings.
const moneySchema = z.string().meta({ example: '20.00' });

const pageMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

// Cierre ciego: GUEST recibe solo salesCount. Cualquier importe le permitiría reconstruir el esperado.
const adminOnly = 'Solo se envía a ADMIN; se omite para GUEST (cierre ciego).';
const adminMoney = (description?: string) =>
  moneySchema.optional().meta({ description: description ? `${description} ${adminOnly}` : adminOnly });

const cashSummarySchema = z.object({
  cashSales: adminMoney(),
  yapeSales: adminMoney(),
  totalSales: adminMoney(),
  salesCount: z.number().int(),
  cashStays: adminMoney('Cobros de estadías en efectivo; forman parte del efectivo esperado.'),
  yapeStays: adminMoney('Cobros de estadías por Yape.'),
  cashIn: adminMoney(),
  cashOut: adminMoney(),
  expectedCash: adminMoney(),
  difference: moneySchema.nullable().optional().meta({ description: `Null mientras la caja está abierta. ${adminOnly}` }),
}).nullable();

export const cashRegisterSchema = z.object({
  id: z.uuid(),
  status: z.enum(['OPEN', 'CLOSED']),
  openedAt: z.iso.datetime(),
  openingAmount: moneySchema,
  openedBy: z.uuid().nullable(),
  openedByName: z.string().nullable(),
  notes: z.string().nullable(),
  closedAt: z.iso.datetime().nullable(),
  closingAmount: moneySchema.nullable(),
  closedBy: z.uuid().nullable(),
  closedByName: z.string().nullable(),
  closingNotes: z.string().nullable(),
  summary: cashSummarySchema,
}).meta({ id: 'CashRegister' });

export const nullableCashRegisterSchema = cashRegisterSchema.nullable().meta({ id: 'NullableCashRegister' });

export const cashRegisterPageSchema = z.object({
  data: z.array(cashRegisterSchema),
  meta: pageMetaSchema,
}).meta({ id: 'CashRegisterPage' });

const cashMovementResponseSchema = z.object({
  id: z.uuid(),
  cashRegisterId: z.uuid(),
  type: z.enum(['CASH_IN', 'CASH_OUT']),
  amount: moneySchema,
  reason: z.string(),
  createdBy: z.uuid().nullable(),
  createdByName: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export const cashMovementPageSchema = z.object({
  data: z.array(cashMovementResponseSchema),
  meta: pageMetaSchema,
}).meta({ id: 'CashMovementPage' });

export const cashRegisterOpenedSchema = z.object({
  id: z.uuid(),
  status: z.enum(['OPEN']),
}).meta({ id: 'CashRegisterOpened' });
