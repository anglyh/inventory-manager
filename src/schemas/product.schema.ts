import z from 'zod';

export const createProductSchema = z.object({
  name: z.string('Nombre requerido').trim().min(1, 'Nombre requerido').max(50, 'Máximo 50 caracteres'),
  minStock: z.coerce.number().int('Debe ser un número entero').nonnegative('No puede ser negativo').optional().default(0),
  barcode: z.string().max(50, 'Máximo 50 caracteres').optional(),
  salePrice: z.coerce.number('Precio de venta requerido').nonnegative('Precio no puede ser negativo')
    .max(99999999.99, 'Precio fuera de rango')
    .multipleOf(0.01, 'Precio debe tener como máximo 2 decimales'),
  categoryId: z.uuid('ID de categoría inválido').nullable().optional()
})

export const updateProductSchema = z.object({
  name: z.string('Nombre requerido').trim().min(1, 'Nombre requerido').max(50, 'Máximo 50 caracteres'),
  barcode: z.string().max(50, 'Máximo 50 caracteres').nullable().optional(),
  minStock: z.coerce.number().int('Debe ser un número entero').nonnegative('No puede ser negativo').optional(),
  salePrice: z.coerce.number('Precio de venta requerido').nonnegative('Precio no puede ser negativo')
    .max(99999999.99, 'Precio fuera de rango')
    .multipleOf(0.01, 'Precio debe tener como máximo 2 decimales'),
  categoryId: z.uuid('ID de categoría inválido').nullable().optional()
})

export const productIdParamSchema = z.object({
  id: z.uuid('ID de producto inválido')
})

export const listProductPaginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  searchTerm: z.coerce.string().optional(),
  category: z.coerce
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const parts = value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return parts.length ? parts : undefined;
    }),
  limit: z.coerce.number().int().positive().max(100).optional().default(12)
})

export type ListProductPagination = z.infer<typeof listProductPaginationSchema>
export type CreateProductDTO = z.infer<typeof createProductSchema>;
export type UpdateProductDTO = z.infer<typeof updateProductSchema>;
