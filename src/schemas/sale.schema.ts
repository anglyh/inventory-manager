import z from 'zod';

export const saleItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().min(1),
})

export const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1)
})

export type CreateSaleDTO = z.infer<typeof createSaleSchema>;
export type SaleItemDTO = z.infer<typeof saleItemSchema>