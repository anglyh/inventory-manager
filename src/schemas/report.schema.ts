import z from 'zod';
import { expenseGroupSchema } from './expense.schema.js';

/** Rango de fechas opcional (si falta, el service asume últimos 30 días). */
export const reportOverviewQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  compareFrom: z.coerce.date().optional().meta({
    description: 'Inicio del período de comparación. Sin compareFrom/compareTo se usa el mismo largo justo antes de from.',
  }),
  compareTo: z.coerce.date().optional(),
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
    revenue: moneySchema.meta({ description: 'Ventas de la tienda. No incluye habitaciones (ver rooms.revenue).' }),
    cogs: moneySchema,
    grossProfit: moneySchema,
    losses: moneySchema.meta({ description: 'Mermas y faltantes de conteo menos sobrantes (a costo), más faltantes de caja. Se mantiene por compatibilidad; store.losses no incluye la caja.' }),
    netProfit: moneySchema.meta({ description: 'store.result + lodging.result − total.cashShortage − total.generalExpenses. Sin gastos equivale a grossProfit − losses + rooms.revenue.' }),
    marginPct: moneySchema.meta({ description: 'netProfit / (revenue + rooms.revenue) × 100.' }),
    salesCount: z.number().int(),
    avgTicket: moneySchema,
  }),
  payments: z.object({
    cash: moneySchema,
    yape: moneySchema,
  }).meta({ description: 'Cobros por método: ventas de la tienda más habitaciones.' }),
  rooms: z.object({
    revenue: moneySchema.meta({ description: 'Cobros de estadías del período (por fecha de pago).' }),
    stays: z.number().int().meta({ description: 'Estadías con ingreso en el período.' }),
    occupancyPct: moneySchema.meta({ description: 'Horas ocupadas / (habitaciones activas × horas transcurridas del período) × 100, máximo 100.' }),
  }),
  store: z.object({
    revenue: moneySchema,
    cogs: moneySchema,
    grossProfit: moneySchema,
    losses: moneySchema.meta({ description: 'Solo mercadería: mermas + faltantes de conteo − sobrantes (a costo).' }),
    result: moneySchema.meta({ description: 'grossProfit − losses.' }),
  }).meta({ description: 'Resultado de la tienda.' }),
  lodging: z.object({
    revenue: moneySchema.meta({ description: 'Cobros de estadías del período (por fecha de pago).' }),
    costs: moneySchema.meta({ description: 'Gastos del grupo LODGING del período.' }),
    result: moneySchema.meta({ description: 'revenue − costs.' }),
  }).meta({ description: 'Resultado del hospedaje.' }),
  total: z.object({
    storeResult: moneySchema,
    lodgingResult: moneySchema,
    cashShortage: moneySchema.meta({ description: 'Faltantes de las cajas cerradas en el período.' }),
    generalExpenses: moneySchema.meta({ description: 'Gastos del grupo GENERAL del período.' }),
    netProfit: moneySchema.meta({ description: 'storeResult + lodgingResult − cashShortage − generalExpenses (igual a summary.netProfit).' }),
  }),
  expensesByCategory: z.array(z.object({
    categoryId: z.uuid(),
    name: z.string(),
    group: expenseGroupSchema,
    amount: moneySchema,
  })).meta({ description: 'Gastos del período por categoría, de mayor a menor. Solo categorías con gastos.' }),
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
    cashShortage: moneySchema,
  }),
  daily: z.array(z.object({
    date: z.iso.date(),
    revenue: moneySchema.meta({ description: 'Ventas de la tienda del día.' }),
    profit: moneySchema,
    rooms: moneySchema.meta({ description: 'Cobros de habitaciones del día.' }),
  })),
  products: z.array(productRankingSchema).meta({
    description: 'Productos vendidos en el rango, ordenados por ventas. El cliente decide cómo ordenarlos.',
  }),
  topLosses: z.array(productLossSchema),
  previous: z.object({
    from: z.iso.datetime(),
    to: z.iso.datetime(),
    revenue: moneySchema,
    grossProfit: moneySchema,
    netProfit: moneySchema,
    salesCount: z.number().int(),
    roomsRevenue: moneySchema,
    storeResult: moneySchema,
    lodgingResult: moneySchema,
    generalExpenses: moneySchema,
  }).meta({ description: 'Período de comparación: compareFrom/compareTo o, si faltan, el mismo largo justo antes de `from`.' }),
  flows: z.object({
    purchases: moneySchema.meta({ description: 'Mercadería comprada en el rango (a costo). No resta ganancia.' }),
    ownerWithdrawals: moneySchema.meta({ description: 'Retiros de caja en el rango. No restan ganancia. Excluye los gastos pagados con la caja (ya restan como gasto).' }),
  }),
  inventory: z.object({
    value: moneySchema.meta({ description: 'Stock actual × costo promedio.' }),
    lowStockCount: z.number().int().meta({ description: 'Productos activos con stock en o bajo el mínimo.' }),
  }).meta({ description: 'Foto actual del inventario: no depende del rango.' }),
}).meta({ id: 'ReportOverview' });

export type ReportOverview = z.infer<typeof reportOverviewSchema>;
