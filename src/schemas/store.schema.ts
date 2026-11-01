import z from 'zod';

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida, use HH:MM');

export const updateStoreSettingsSchema = z.object({
  checkoutTime: timeOfDay.optional().meta({ description: 'Hora de salida de las estadías por noche (hora de Lima).', example: '12:00' }),
  extraToleranceMinutes: z.number().int('Debe ser un número entero').min(0).max(240).optional()
    .meta({ description: 'Minutos de gracia antes de sugerir horas adicionales.', example: 15 }),
}).strict().meta({ id: 'UpdateStoreSettings' });

export type UpdateStoreSettingsDTO = z.infer<typeof updateStoreSettingsSchema>;

// Response schemas.
export const storeSettingsSchema = z.object({
  checkoutTime: z.string().meta({ example: '12:00' }),
  extraToleranceMinutes: z.number().int(),
}).meta({ id: 'StoreSettings' });
