import { z } from 'zod';

const nameSchema = z.string('Nombre requerido').min(1, 'Nombre requerido').max(100, 'Máximo 100 caracteres');

export const createCategorySchema = z.object({
  name: nameSchema.meta({ example: 'Bebidas' }),
});

export const updateCategorySchema = z.object({
  name: nameSchema.meta({ example: 'Snacks' }),
});

export const categoryIdParamSchema = z.object({
  id: z.uuid('ID de categoría inválido'),
});

// Response schemas.
export const categoryResponseSchema = z.object({
  id: z.uuid(),
  storeId: z.uuid(),
  name: z.string(),
  createdAt: z.iso.datetime(),
}).meta({ id: 'Category' });
