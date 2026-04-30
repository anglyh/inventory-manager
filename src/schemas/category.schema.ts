import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string('Nombre requerido').min(1, 'Nombre requerido').max(100, 'Máximo 100 caracteres'),
});

export const updateCategorySchema = z.object({
  name: z.string('Nombre requerido').min(1, 'Nombre requerido').max(100, 'Máximo 100 caracteres'),
});

export const categoryIdParamSchema = z.object({
  id: z.uuid('ID de categoría inválido'),
});