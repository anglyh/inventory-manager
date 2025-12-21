import z from 'zod';

export const purchaseItemSchema = z.object({
  productId: z.uuid('ID de producto inválido'),
  unitCost: z.number('Costo unitario requerido').nonnegative('Costo unitario no puede ser negativo'),
  quantity: z.number('Cantidad requerida').int('Debe ser un número entero').positive('Debe ser mayor a 0')
})

export const createPurchaseSchema = z.object({
  supplierName: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema, 'Items requeridos').min(1, 'Debe incluir al menos un producto')
})

export type CreatePurchaseDTO = z.infer<typeof createPurchaseSchema>;