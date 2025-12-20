import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1),
  minStock: z.coerce.number().int().nonnegative().optional().default(0),
  barcode: z.string().max(50).optional(),
  salePrice: z.number().min(0),
  categoryId: z.uuid().optional()
})

