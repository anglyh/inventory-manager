import z from 'zod';

export const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().min(1)
})

export const createPurchaseSchema = z.object({
  supplierName: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1)
})

export type CreatePurchaseDTO = z.infer<typeof createPurchaseSchema>;