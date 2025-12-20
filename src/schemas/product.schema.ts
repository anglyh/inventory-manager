import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1),
  minStock: z.coerce.number().int().nonnegative().optional().default(0),
  salePrice: z.number().min(0),
  categoryId: z.uuid().optional()
})

