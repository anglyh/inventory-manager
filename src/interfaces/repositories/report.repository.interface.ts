import type { ReportOverview } from '../../schemas/report.schema.js';

/** Totales de ventas y pérdidas del rango en una sola fila. */
export interface ReportTotalsRow {
  revenue: string;
  cogs: string;
  grossProfit: string;
  netProfit: string;
  marginPct: string;
  salesCount: number;
  avgTicket: string;
  /** Sobrantes de conteo a costo: suman al resultado de la tienda. */
  countSurplus: string;
  cashShortage: string;
  cashSurplus: string;
  /** Cajas cerradas en el rango con faltante (diferencia negativa). */
  cashShortageCount: number;
  /** Cobros en efectivo / Yape: ventas de la tienda más habitaciones. */
  cashPayments: string;
  yapePayments: string;
  roomsRevenue: string;
  /** Vencidos, dañados y faltantes de conteo a costo (sin sobrantes ni caja). */
  storeLosses: string;
  storeResult: string;
  lodgingCosts: string;
  lodgingResult: string;
  generalExpenses: string;
  staysCount: number;
  occupancyPct: string;
}

export type DailySalesRow = ReportOverview['daily'][number];
export type ProductRankingRow = ReportOverview['products'][number];
export type FlowsRow = ReportOverview['flows'];
export type InventorySnapshotRow = ReportOverview['inventory'];

/** Filtros comunes: rango de fechas ya resuelto por el service. */
export interface ReportDateRange {
  storeId: string;
  from: Date;
  to: Date;
}

export interface IReportRepository {
  getTotals(filters: ReportDateRange): Promise<ReportTotalsRow>;

  getDailySales(filters: ReportDateRange): Promise<DailySalesRow[]>;

  getProducts(filters: ReportDateRange & { limit: number }): Promise<ProductRankingRow[]>;

  getFlows(filters: ReportDateRange): Promise<FlowsRow>;

  getInventorySnapshot(storeId: string): Promise<InventorySnapshotRow>;

  /** Foto actual: estadías con extranjeros sin reportar a Migraciones, de cualquier fecha. */
  getPendingMigrationsCount(storeId: string): Promise<number>;
}
