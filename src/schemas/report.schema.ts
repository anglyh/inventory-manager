import z from 'zod';

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

const lowStockProductSchema = z.object({
  productId: z.uuid(),
  productName: z.string(),
  stock: z.number().int(),
  minStock: z.number().int(),
});

export const reportOverviewSchema = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  summary: z.object({
    revenue: moneySchema.meta({ description: 'Ventas de la tienda. No incluye habitaciones (ver rooms.revenue).' }),
    cogs: moneySchema,
    grossProfit: moneySchema,
    netProfit: moneySchema.meta({ description: 'store.result + lodging.result − total.cashShortage + total.cashSurplus − total.generalExpenses.' }),
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
    losses: moneySchema.meta({ description: 'Vencidos, dañados y faltantes de conteo (a costo).' }),
    countSurplus: moneySchema.meta({ description: 'Sobrantes de conteo (a costo). Suman al resultado.' }),
    result: moneySchema.meta({ description: 'grossProfit − losses + countSurplus.' }),
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
    cashShortageCount: z.number().int().meta({ description: 'Cajas cerradas en el período con faltante (diferencia negativa).' }),
    cashSurplus: moneySchema.meta({ description: 'Sobrantes de las cajas cerradas en el período.' }),
    generalExpenses: moneySchema.meta({ description: 'Gastos del grupo GENERAL del período.' }),
    netProfit: moneySchema.meta({ description: 'storeResult + lodgingResult − cashShortage + cashSurplus − generalExpenses (igual a summary.netProfit).' }),
  }),
  daily: z.array(z.object({
    date: z.iso.date(),
    revenue: moneySchema.meta({ description: 'Ventas de la tienda del día.' }),
    profit: moneySchema.meta({ description: 'Ganancia bruta de la tienda del día (ventas − costo).' }),
    rooms: moneySchema.meta({ description: 'Cobros de habitaciones del día.' }),
    lodgingResult: moneySchema.meta({ description: 'Cobros de habitaciones del día − gastos del hospedaje del día.' }),
  })),
  products: z.array(productRankingSchema).meta({
    description: 'Productos vendidos en el rango, ordenados por ventas. El cliente decide cómo ordenarlos.',
  }),
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
    purchases: moneySchema.meta({ description: 'Mercadería comprada en el rango (a costo). No resta ganancia: pasa al stock.' }),
  }),
  inventory: z.object({
    value: moneySchema.meta({ description: 'Stock actual × costo promedio.' }),
    lowStockCount: z.number().int().meta({ description: 'Productos activos con stock en o bajo el mínimo.' }),
    lowStockProducts: z.array(lowStockProductSchema).meta({ description: 'Hasta 5 de esos productos, los más urgentes primero (menor stock − mínimo).' }),
  }).meta({ description: 'Foto actual del inventario: no depende del rango.' }),
  migrations: z.object({
    pendingCount: z.number().int().meta({
      description: 'Estadías (abiertas o cerradas, de cualquier fecha) con al menos un huésped extranjero que aún no se reportaron a Migraciones.',
    }),
  }).meta({ description: 'Foto actual de lo pendiente con Migraciones: no depende del rango.' }),
}).meta({ id: 'ReportOverview' });

export type ReportOverview = z.infer<typeof reportOverviewSchema>;
