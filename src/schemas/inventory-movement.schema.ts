import z from 'zod';

export const movementTypeSchema = z.enum(['IN', 'OUT']);

export const movementItemSchema = z.object({
  productId: z.uuid('ID de producto inválido'),
  unitPrice: z.number('Precio/Costo requerido').nonnegative('No puede ser negativo')
    .max(99999999.99, 'Precio/Costo fuera de rango')
    .multipleOf(0.01, 'Precio/Costo debe tener como máximo 2 decimales'),
  quantity: z.number('Cantidad requerida').int('Debe ser un número entero').positive('Debe ser mayor a 0'),
});

export const saleItemSchema = movementItemSchema.omit({ unitPrice: true }).extend({
  salePrice: movementItemSchema.shape.unitPrice,
}).strict();

export const purchaseItemSchema = movementItemSchema.omit({ unitPrice: true }).extend({
  unitCost: movementItemSchema.shape.unitPrice,
}).strict();

export const movementReasonSchema = z.enum(['PURCHASE', 'SALE', 'LOSS_EXPIRED', 'LOSS_DAMAGED', 'COUNT_SURPLUS', 'COUNT_SHORTAGE', 'INITIAL_LOAD', 'MANUAL_CORRECTION']);
export const paymentMethodSchema = z.enum(['CASH', 'YAPE']);

const movementBaseSchema = z.object({
  notes: z.string().optional(),
  items: z.array(movementItemSchema, 'Items requeridos').min(1, 'Debe incluir al menos un producto'),
});

export const saleSchema = movementBaseSchema.extend({
  items: z.array(saleItemSchema, 'Items requeridos').min(1, 'Debe incluir al menos un producto'),
  paymentMethod: paymentMethodSchema,
  cashRegisterId: z.uuid('ID de caja inválido').optional(),
}).strict();

export const purchaseSchema = movementBaseSchema.extend({
  items: z.array(purchaseItemSchema, 'Items requeridos').min(1, 'Debe incluir al menos un producto'),
  supplierId: z.uuid('ID de proveedor inválido').optional(),
}).strict();

export const lossSchema = movementBaseSchema.extend({
  reason: z.enum(['LOSS_EXPIRED', 'LOSS_DAMAGED',]),
}).strict();

export const initialLoadSchema = movementBaseSchema.strict();

// El conteo determina la dirección. Solo una corrección manual necesita elegirla.
export const adjustmentSchema = z.discriminatedUnion('reason', [
  movementBaseSchema.extend({
    reason: z.enum(['COUNT_SURPLUS', 'COUNT_SHORTAGE']),
  }).strict(),
  movementBaseSchema.extend({
    reason: z.literal('MANUAL_CORRECTION'),
    movementType: movementTypeSchema,
  }).strict(),
]);

export type MovementItemDTO = z.infer<typeof movementItemSchema>;
export type SaleDTO = z.infer<typeof saleSchema>;
export type PurchaseDTO = z.infer<typeof purchaseSchema>;
export type LossDTO = z.infer<typeof lossSchema>;
export type InitialLoadDTO = z.infer<typeof initialLoadSchema>;
export type AdjustmentDTO = z.infer<typeof adjustmentSchema>;

/** Query para listar movimientos con paginación por cursor (misma página: enviar ambos cursores o ninguno). */
export const inventoryMovementsCursorQuerySchema = z
  .object({
    movementType: movementTypeSchema.optional(),
    group: z.enum(['sales', 'purchase', 'loss', 'voids']).optional(),
    limit: z.coerce.number().int().positive().max(100).optional().default(12),
    cursorId: z.string().optional(),
    cursorDate: z.string().optional(),
  })
  .refine(
    (q) =>
      (q.cursorId !== undefined &&
        q.cursorId !== '' &&
        q.cursorDate !== undefined &&
        q.cursorDate !== '') ||
      ((q.cursorId === undefined || q.cursorId === '') &&
        (q.cursorDate === undefined || q.cursorDate === '')),
    {
      message: 'cursorId y cursorDate deben enviarse juntos',
      path: ['cursorId'],
    }
  );

export type InventoryMovementsCursorQueryDTO = z.infer<
  typeof inventoryMovementsCursorQuerySchema
>;
