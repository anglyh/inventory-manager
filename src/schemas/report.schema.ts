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

// Response schemas. NUMERIC amounts from PostgreSQL are serialized as strings.
const moneySchema = z.string().meta({ example: '20.00' });

const rangeFields = {
  from: z.iso.datetime(),
  to: z.iso.datetime(),
};

const profitFields = {
  revenue: moneySchema,
  cogs: moneySchema,
  profit: moneySchema,
  marginPct: moneySchema,
};

export const profitSummarySchema = z.object({
  ...rangeFields,
  ...profitFields,
  salesCount: z.number().int(),
  avgTicket: moneySchema,
}).meta({ id: 'ProfitSummary' });

export const profitByProductSchema = z.object({
  ...rangeFields,
  products: z.array(z.object({
    productId: z.uuid(),
    productName: z.string(),
    quantitySold: z.number().int(),
    ...profitFields,
  })),
}).meta({ id: 'ProfitByProduct' });
