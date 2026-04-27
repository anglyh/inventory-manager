import z from 'zod';

/** Base común: rango de fechas opcional (si falta, el service asume últimos 30 días). */
const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const profitSummaryQuerySchema = dateRangeSchema;

export const profitByProductQuerySchema = dateRangeSchema.extend({
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export type ProfitSummaryQueryDTO = z.infer<typeof profitSummaryQuerySchema>;
export type ProfitByProductQueryDTO = z.infer<typeof profitByProductQuerySchema>;
