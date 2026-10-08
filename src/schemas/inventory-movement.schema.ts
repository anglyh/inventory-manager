import z from 'zod';

export const movementTypeSchema = z.enum(['IN', 'OUT']);

export const movementItemSchema = z.object({
  productId: z.uuid('ID de producto inválido'),
  unitPrice: z.number('Precio/Costo requerido').nonnegative('No puede ser negativo')
    .max(99999999.99, 'Precio/Costo fuera de rango')
    .multipleOf(0.01, 'Precio/Costo debe tener como máximo 2 decimales'),
  quantity: z.number('Cantidad requerida').int('Debe ser un número entero').positive('Debe ser mayor a 0').max(2147483647),
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
  notes: z.string().trim().max(500).optional(),
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

// Las diferencias de conteo (COUNT_*) solo se registran vía /stock-counts.
export const adjustmentSchema = movementBaseSchema.extend({
  reason: z.literal('MANUAL_CORRECTION'),
  movementType: movementTypeSchema,
}).strict();

export type MovementItemDTO = z.infer<typeof movementItemSchema>;
export type SaleDTO = z.infer<typeof saleSchema>;
export type PurchaseDTO = z.infer<typeof purchaseSchema>;
export type LossDTO = z.infer<typeof lossSchema>;
export type InitialLoadDTO = z.infer<typeof initialLoadSchema>;
export type AdjustmentDTO = z.infer<typeof adjustmentSchema>;

export const stockCountSchema = z.object({
  notes: z.string().trim().min(1, 'Explique el motivo del conteo').max(500),
  items: z.array(z.object({
    productId: z.uuid('ID de producto inválido'),
    countedQuantity: z.number().int().min(0).max(2147483647),
  }).strict()).min(1),
}).strict().refine(body => new Set(body.items.map(item => item.productId)).size === body.items.length, {
  message: 'No repita productos en un conteo', path: ['items'],
});
export type StockCountDTO = z.infer<typeof stockCountSchema>;
export const inventoryMovementIdSchema = z.object({ id: z.uuid('ID de movimiento inválido') });
export const voidMovementSchema = z.object({
  reason: z.string().trim().min(1, 'El motivo es obligatorio').max(500),
}).strict();

/** Query para listar movimientos con paginación por cursor (misma página: enviar ambos cursores o ninguno). */
export const inventoryMovementsCursorQuerySchema = z
  .object({
    movementType: movementTypeSchema.optional(),
    reason: movementReasonSchema.optional(),
    productId: z.uuid('ID de producto inválido').optional(),
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    cashRegisterId: z.uuid('ID de caja inválido').optional(),
    group: z.enum(['sales', 'purchase', 'loss', 'voids']).optional(),
    limit: z.coerce.number().int().positive().max(100).optional().default(12),
    cursorId: z.uuid('ID de cursor inválido').optional(),
    cursorDate: z.iso.datetime({ offset: true }).optional(),
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
  )
  .refine(q => !q.from || !q.to || Date.parse(q.from) < Date.parse(q.to), {
    message: 'from debe ser anterior a to', path: ['to'],
  });

export type InventoryMovementsCursorQueryDTO = z.infer<
  typeof inventoryMovementsCursorQuerySchema
>;
