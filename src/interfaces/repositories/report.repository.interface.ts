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
}

export type CashDifferencesRow = ReportOverview['cash'];
export type DailySalesRow = ReportOverview['daily'][number];
export type ProductRankingRow = ReportOverview['topSold'][number];
export type ProductLossRow = ReportOverview['topLosses'][number];

export type ProductRankingOrder = 'quantity' | 'profit';

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

  getProductRanking(
    filters: ReportDateRange & { orderBy: ProductRankingOrder; limit: number }
  ): Promise<ProductRankingRow[]>;

  getTopLosses(filters: ReportDateRange & { limit: number }): Promise<ProductLossRow[]>;
}
