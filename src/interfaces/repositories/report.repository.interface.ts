import type { ReportOverview } from '../../schemas/report.schema.js';

/** Totales de ventas y pérdidas del rango en una sola fila. */
export interface ReportTotalsRow {
  revenue: string;
  cogs: string;
  grossProfit: string;
  losses: string;
  netProfit: string;
  marginPct: string;
  salesCount: number;
  avgTicket: string;
  cashSales: string;
  yapeSales: string;
  expired: string;
  damaged: string;
  countShortage: string;
  countSurplus: string;
  cashShortage: string;
  /** Cajas cerradas en el rango con faltante (diferencia negativa). */
  cashShortageCount: number;
  /** Cobros en efectivo / Yape: ventas de la tienda más habitaciones. */
  cashPayments: string;
  yapePayments: string;
  roomsRevenue: string;
  /** Mermas de mercadería sin el faltante de caja (losses sí lo incluye, por compatibilidad). */
  storeLosses: string;
  storeResult: string;
  lodgingCosts: string;
  lodgingResult: string;
  generalExpenses: string;
  staysCount: number;
  occupancyPct: string;
}

export type CashDifferencesRow = ReportOverview['cash'];
export type DailySalesRow = ReportOverview['daily'][number];
export type ProductRankingRow = ReportOverview['products'][number];
export type ProductLossRow = ReportOverview['topLosses'][number];
export type FlowsRow = ReportOverview['flows'];
export type ExpenseByCategoryRow = ReportOverview['expensesByCategory'][number];
export type InventorySnapshotRow = ReportOverview['inventory'];

/** Filtros comunes: rango de fechas ya resuelto por el service. */
export interface ReportDateRange {
  storeId: string;
  from: Date;
  to: Date;
}

export interface IReportRepository {
  getTotals(filters: ReportDateRange): Promise<ReportTotalsRow>;

  getCashDifferences(filters: ReportDateRange): Promise<CashDifferencesRow>;

  getDailySales(filters: ReportDateRange): Promise<DailySalesRow[]>;

  getProducts(filters: ReportDateRange & { limit: number }): Promise<ProductRankingRow[]>;

  getTopLosses(filters: ReportDateRange & { limit: number }): Promise<ProductLossRow[]>;

  getExpensesByCategory(filters: ReportDateRange): Promise<ExpenseByCategoryRow[]>;

  getFlows(filters: ReportDateRange): Promise<FlowsRow>;

  getInventorySnapshot(storeId: string): Promise<InventorySnapshotRow>;

  /** Foto actual: estadías con extranjeros sin reportar a Migraciones, de cualquier fecha. */
  getPendingMigrationsCount(storeId: string): Promise<number>;
}
