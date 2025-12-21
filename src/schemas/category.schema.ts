import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string('Nombre requerido').min(1, 'Nombre requerido').max(100, 'Máximo 100 caracteres'),
  icon: z.string().max(100, 'Máximo 100 caracteres').optional()
})