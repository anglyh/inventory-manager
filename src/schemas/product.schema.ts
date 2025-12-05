import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1),
  stock: z.number().int().min(0),
  salePrice: z.number().min(0),
  unitCost: z.number().min(0),
  categoryId: z.uuid().optional()
})

