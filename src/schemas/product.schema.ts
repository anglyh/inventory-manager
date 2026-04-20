import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string('Nombre requerido').min(1, 'Nombre requerido').max(50, 'Máximo 50 caracteres'),
  minStock: z.coerce.number().int('Debe ser un número entero').nonnegative('No puede ser negativo').optional().default(0),
  barcode: z.string().max(50, 'Máximo 50 caracteres').optional(),
  salePrice: z.coerce.number('Precio de venta requerido').nonnegative('Precio no puede ser negativo'),
  categoryId: z.uuid('ID de categoría inválido').nullable().optional()
})

export const updateProductSchema = z.object({
  name: z.string('Nombre requerido').min(1, 'Nombre requerido').max(50, 'Máximo 50 caracteres'),
  barcode: z.string().max(50, 'Máximo 50 caracteres').nullable().optional(),
  minStock: z.coerce.number().int('Debe ser un número entero').nonnegative('No puede ser negativo').optional(),
  salePrice: z.coerce.number('Precio de venta requerido').nonnegative('Precio no puede ser negativo'),
  categoryId: z.uuid('ID de categoría inválido').nullable().optional()
})

export const productIdParamSchema = z.object({
  id: z.uuid('ID de producto inválido')
})

export const listProductPaginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  searchTerm: z.coerce.string().optional(),
  categoryId: z.uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(12)
})

export type ListProductPagination = z.infer<typeof listProductPaginationSchema>