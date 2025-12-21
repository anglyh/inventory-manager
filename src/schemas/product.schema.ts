import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string('Nombre requerido').min(1, 'Nombre requerido').max(50, 'Máximo 50 caracteres'),
  minStock: z.coerce.number().int('Debe ser un número entero').nonnegative('No puede ser negativo').optional().default(0),
  barcode: z.string().max(50, 'Máximo 50 caracteres').optional(),
  salePrice: z.number('Precio de venta requerido').nonnegative('Precio no puede ser negativo'),
  categoryId: z.uuid('ID de categoría inválido').optional()
})

