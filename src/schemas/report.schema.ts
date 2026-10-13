import z from 'zod';

/** Rango de fechas opcional (si falta, el service asume últimos 30 días). */
export const reportOverviewQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ReportOverviewQueryDTO = z.infer<typeof reportOverviewQuerySchema>;

// Response schemas. NUMERIC amounts from PostgreSQL are serialized as strings.
const moneySchema = z.string().meta({ example: '20.00' });

const productRankingSchema = z.object({
  productId: z.uuid(),
  productName: z.string(),
  quantity: z.number().int(),
  revenue: moneySchema,
  profit: moneySchema,
});

const productLossSchema = z.object({
  productId: z.uuid(),
  productName: z.string(),
  quantity: z.number().int(),
  amount: moneySchema,
});

export const reportOverviewSchema = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  summary: z.object({
    revenue: moneySchema,
    cogs: moneySchema,
    grossProfit: moneySchema,
    losses: moneySchema.meta({ description: 'Mermas y faltantes de conteo, menos sobrantes (a costo).' }),
    netProfit: moneySchema.meta({ description: 'grossProfit − losses.' }),
    marginPct: moneySchema.meta({ description: 'netProfit / revenue × 100.' }),
    salesCount: z.number().int(),
    avgTicket: moneySchema,
  }),
  payments: z.object({
    cash: moneySchema,
    yape: moneySchema,
  }),
  cash: z.object({
    closedCount: z.number().int(),
    shortage: moneySchema.meta({ description: 'Suma de faltantes de las cajas cerradas (positivo).' }),
    surplus: moneySchema.meta({ description: 'Suma de sobrantes de las cajas cerradas.' }),
    difference: moneySchema,
  }),
  losses: z.object({
    expired: moneySchema,
    damaged: moneySchema,
    countShortage: moneySchema,
    countSurplus: moneySchema,
  }),
  daily: z.array(z.object({
    date: z.iso.date(),
    revenue: moneySchema,
    profit: moneySchema,
  })),
  topSold: z.array(productRankingSchema),
  topProfit: z.array(productRankingSchema),
  topLosses: z.array(productLossSchema),
}).meta({ id: 'ReportOverview' });

export type ReportOverview = z.infer<typeof reportOverviewSchema>;
