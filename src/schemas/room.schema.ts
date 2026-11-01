import z from 'zod';

const money = z.number('Importe requerido').nonnegative('No puede ser negativo').max(99999999.99, 'Importe fuera de rango')
  .multipleOf(0.01, 'Importe debe tener como máximo 2 decimales')
  // zod-to-openapi does not emit Zod's multipleOf check, so it is documented explicitly.
  .meta({ multipleOf: 0.01 });

// --- Room types ----------------------------------------------------------------

const roomTypeFields = {
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(50).meta({ example: 'Estándar' }),
  capacity: z.number().int('Debe ser un número entero').min(1).max(20)
    .meta({ description: 'Huéspedes adultos permitidos. Los menores no cuentan.', example: 2 }),
  description: z.string().trim().max(500).nullable().optional().meta({ example: 'Cama de 2 plazas, baño compartido' }),
  hourPrice: money.meta({ description: 'Precio de referencia por hora: la tarifa por horas sugiere horas × este precio.', example: 10 }),
  nightPrice: money.meta({ example: 50 }),
  extraHourPrice: money.meta({ example: 10 }),
};

export const createRoomTypeSchema = z.object(roomTypeFields).strict().meta({ id: 'CreateRoomType' });

export const updateRoomTypeSchema = z.object(roomTypeFields).partial().extend({
  isActive: z.boolean().optional(),
}).strict().meta({ id: 'UpdateRoomType' });

export type CreateRoomTypeDTO = z.infer<typeof createRoomTypeSchema>;
export type UpdateRoomTypeDTO = z.infer<typeof updateRoomTypeSchema>;

// --- Rooms ---------------------------------------------------------------------

const roomFields = {
  number: z.string().trim().min(1, 'El número es obligatorio').max(10).meta({ example: '201' }),
  floor: z.number().int('Debe ser un número entero').min(-5).max(200).nullable().optional().meta({ example: 2 }),
  roomTypeId: z.uuid('ID de tipo de habitación inválido'),
};

export const createRoomSchema = z.object(roomFields).strict().meta({ id: 'CreateRoom' });

export const updateRoomSchema = z.object({
  number: roomFields.number.optional(),
  floor: roomFields.floor,
  roomTypeId: roomFields.roomTypeId.optional(),
  isActive: z.boolean().optional(),
  needsCleaning: z.boolean().optional(),
}).strict().meta({ id: 'UpdateRoom' });

export const roomIdSchema = z.object({ id: z.uuid('ID de habitación inválido') });
export const roomTypeIdSchema = z.object({ id: z.uuid('ID de tipo de habitación inválido') });

export type CreateRoomDTO = z.infer<typeof createRoomSchema>;
export type UpdateRoomDTO = z.infer<typeof updateRoomSchema>;

// --- Responses (NUMERIC amounts from PostgreSQL are serialized as strings) --------

const moneySchema = z.string().meta({ example: '30.00' });

export const roomTypeResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  capacity: z.number().int(),
  description: z.string().nullable(),
  hourPrice: moneySchema,
  nightPrice: moneySchema,
  extraHourPrice: moneySchema,
  isActive: z.boolean(),
  roomCount: z.number().int().meta({ description: 'Habitaciones asignadas a este tipo.' }),
  createdAt: z.iso.datetime(),
}).meta({ id: 'RoomType' });

export const roomStatusSchema = z.enum(['FREE', 'OCCUPIED', 'CLEANING']).meta({ id: 'RoomStatus' });

export const roomResponseSchema = z.object({
  id: z.uuid(),
  number: z.string(),
  floor: z.number().int().nullable(),
  roomTypeId: z.uuid(),
  roomTypeName: z.string(),
  capacity: z.number().int(),
  needsCleaning: z.boolean(),
  isActive: z.boolean(),
  status: roomStatusSchema.meta({ description: 'Calculado: OCCUPIED si hay estadía activa; si no, CLEANING si falta limpiar; si no, FREE.' }),
  activeStay: z.object({
    stayId: z.uuid(),
    holderName: z.string().nullable(),
    rateKind: z.enum(['HOURLY', 'NIGHT']),
    hours: z.number().int().nullable(),
    checkInAt: z.iso.datetime(),
    expectedCheckOut: z.iso.datetime(),
    balance: moneySchema,
  }).nullable(),
}).meta({ id: 'Room' });
