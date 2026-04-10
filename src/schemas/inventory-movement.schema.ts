import z from 'zod';

export const movementTypeSchema = z.enum(['IN', 'OUT', 'ADJUSTMENT']);

export const movementItemSchema = z.object({
  productId: z.uuid('ID de producto inválido'),
  unitPrice: z.number('Precio/Costo requerido').nonnegative('No puede ser negativo'),
  quantity: z.number('Cantidad requerida').int('Debe ser un número entero').positive('Debe ser mayor a 0'),
});

/** Cuerpo para registrar entrada (compra) o salida (venta); el tipo de movimiento lo fija la ruta. */
export const createInventoryMovementPayloadSchema = z.object({
  entityName: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(movementItemSchema, 'Items requeridos').min(1, 'Debe incluir al menos un producto'),
});

export const listInventoryMovementsPaginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(12),
});

export const listInventoryMovementsQuerySchema = listInventoryMovementsPaginationSchema.extend({
  movementType: movementTypeSchema.optional(),
});

export type CreateInventoryMovementPayloadDTO = z.infer<
  typeof createInventoryMovementPayloadSchema
>;
export type ListInventoryMovementsPagination = z.infer<
  typeof listInventoryMovementsPaginationSchema
>;
export type ListInventoryMovementsQuery = z.infer<typeof listInventoryMovementsQuerySchema>;