import z from 'zod';

const money = z.coerce
  .number()
  .nonnegative()
  .refine((v) => Math.round(v * 100) === v * 100, {
    error: "unitCost debe tener máximo 2 decimales"
  })

export const purchaseItemSchema = z.object({
  productId: z.uuid(),
  unitCost: z.number().min(0),
  quantity: z.number().min(1)
})

export const createPurchaseSchema = z.object({
  supplierName: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1)
})

export type CreatePurchaseDTO = z.infer<typeof createPurchaseSchema>;