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

/** Query para listar movimientos con paginación por cursor (misma página: enviar ambos cursores o ninguno). */
export const inventoryMovementsCursorQuerySchema = z
  .object({
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

export type CreateInventoryMovementPayloadDTO = z.infer<
  typeof createInventoryMovementPayloadSchema
>;
export type InventoryMovementsCursorQueryDTO = z.infer<
  typeof inventoryMovementsCursorQuerySchema
>;
