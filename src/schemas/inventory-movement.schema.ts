import z from 'zod';

export const movementTypeSchema = z.enum(['IN', 'OUT']);

export const movementItemSchema = z.object({
  productId: z.uuid('ID de producto inválido'),
  unitPrice: z.number('Precio/Costo requerido').nonnegative('No puede ser negativo')
    .max(99999999.99, 'Precio/Costo fuera de rango')
    .multipleOf(0.01, 'Precio/Costo debe tener como máximo 2 decimales')
    // zod-to-openapi does not emit Zod's multipleOf check, so it is documented explicitly.
    .meta({ multipleOf: 0.01 }),
  quantity: z.number('Cantidad requerida').int('Debe ser un número entero').positive('Debe ser mayor a 0').max(2147483647),
});

export const saleItemSchema = movementItemSchema.omit({ unitPrice: true }).extend({
  salePrice: movementItemSchema.shape.unitPrice.meta({ description: 'Precio cobrado por unidad en esta venta.', example: 3.5 }),
}).strict();

export const purchaseItemSchema = movementItemSchema.omit({ unitPrice: true }).extend({
  unitCost: movementItemSchema.shape.unitPrice.meta({ description: 'Costo pagado por unidad en esta compra.', example: 2 }),
}).strict();

// Item lists are named with .meta({ id }) so the OpenAPI document references them as components.
const movementItemsSchema = z.array(movementItemSchema, 'Items requeridos').min(1, 'Debe incluir al menos un producto')
  .meta({ id: 'MovementItems' });
const saleItemsSchema = z.array(saleItemSchema, 'Items requeridos').min(1, 'Debe incluir al menos un producto')
  .meta({ id: 'SaleItems' });
const purchaseItemsSchema = z.array(purchaseItemSchema, 'Items requeridos').min(1, 'Debe incluir al menos un producto')
  .meta({ id: 'PurchaseItems' });

export const movementReasonSchema = z.enum(['PURCHASE', 'SALE', 'LOSS_EXPIRED', 'LOSS_DAMAGED', 'COUNT_SURPLUS', 'COUNT_SHORTAGE', 'INITIAL_LOAD', 'MANUAL_CORRECTION']);
export const paymentMethodSchema = z.enum(['CASH', 'YAPE']);

const movementBaseSchema = z.object({
  notes: z.string().trim().max(500).optional(),
  items: movementItemsSchema,
});

export const saleSchema = movementBaseSchema.extend({
  items: saleItemsSchema,
  paymentMethod: paymentMethodSchema,
  cashRegisterId: z.uuid('ID de caja inválido').optional()
    .meta({ description: 'Caja abierta de la misma tienda; si se omite, el servidor la selecciona.' }),
}).strict();

export const purchaseSchema = movementBaseSchema.extend({
  items: purchaseItemsSchema,
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
}).meta({ id: 'StockCount' });
export type StockCountDTO = z.infer<typeof stockCountSchema>;
export const inventoryMovementIdSchema = z.object({ id: z.uuid('ID de movimiento inválido') });
export const voidMovementSchema = z.object({
  reason: z.string().trim().min(1, 'El motivo es obligatorio').max(500),
}).strict();

// Documents a query parameter without changing its validation.
const paramDoc = (description: string) => ({ param: { description } });

/** Query para listar movimientos con paginación por cursor (misma página: enviar ambos cursores o ninguno). */
export const inventoryMovementsCursorQuerySchema = z
  .object({
    movementType: movementTypeSchema.optional().meta(paramDoc(
      'IN incluye compras, cargas iniciales y ajustes de entrada. OUT incluye ventas, pérdidas y ajustes de salida. Sin este filtro incluye ambas direcciones.',
    )),
    reason: movementReasonSchema.optional().meta(paramDoc('Motivo exacto; se combina con group y movementType.')),
    productId: z.uuid('ID de producto inválido').optional()
      .meta(paramDoc('Movimientos que contienen este producto; conserva todos los artículos del movimiento.')),
    from: z.iso.datetime({ offset: true }).optional().meta(paramDoc('Fecha inicial inclusiva, ISO con zona horaria.')),
    to: z.iso.datetime({ offset: true }).optional().meta(paramDoc('Fecha final exclusiva, posterior a from.')),
    cashRegisterId: z.uuid('ID de caja inválido').optional().meta(paramDoc(
      'Filtra movimientos vinculados a una caja de esta tienda. Se puede combinar con movementType y group.',
    )),
    group: z.enum(['sales', 'purchase', 'loss', 'voids']).optional().meta(paramDoc(
      'sales incluye SALE; purchase incluye PURCHASE; loss incluye LOSS_EXPIRED, LOSS_DAMAGED y COUNT_SHORTAGE. Sin grupo incluye todos los motivos completados. voids incluye anulados de cualquier motivo.',
    )),
    limit: z.coerce.number().int().positive().max(100).optional().default(12),
    cursorId: z.uuid('ID de cursor inválido').optional()
      .meta(paramDoc('Valor nextCursor.cursorId de la página anterior; enviar junto con cursorDate.')),
    cursorDate: z.iso.datetime({ offset: true }).optional()
      .meta(paramDoc('Valor nextCursor.cursorDate de la página anterior; enviar junto con cursorId.')),
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

// Response schemas. NUMERIC amounts from PostgreSQL are serialized as strings.
const moneySchema = z.string().meta({ example: '20.00' });

export const inventoryMovementSchema = z.object({
  id: z.uuid(),
  storeId: z.uuid(),
  cashRegisterId: z.uuid().nullable(),
  movementType: movementTypeSchema,
  reason: movementReasonSchema,
  paymentMethod: paymentMethodSchema.nullable(),
  supplierId: z.uuid().nullable(),
  supplierName: z.string().nullable(),
  createdBy: z.uuid().nullable(),
  createdByName: z.string().nullable(),
  voidedBy: z.uuid().nullable(),
  status: z.enum(['COMPLETED', 'VOIDED']),
  voidedAt: z.iso.datetime().nullable(),
  voidReason: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.iso.datetime(),
  totalAmount: moneySchema,
  items: z.array(z.object({
    productId: z.uuid(),
    productName: z.string(),
    unitPrice: moneySchema,
    unitCost: moneySchema,
    quantity: z.number().int(),
  })),
}).meta({ id: 'InventoryMovement' });

export const inventoryMovementsPageSchema = z.object({
  data: z.array(inventoryMovementSchema),
  nextCursor: z.object({ cursorDate: z.iso.datetime(), cursorId: z.uuid() }).nullable(),
}).meta({ id: 'InventoryMovementsPage' });
