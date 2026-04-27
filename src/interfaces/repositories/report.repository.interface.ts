export interface ProfitSummaryRow {
  revenue: string;
  cogs: string;
  profit: string;
  marginPct: string;
  salesCount: number;
  avgTicket: string;
}

export interface ProfitByProductRow {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: string;
  cogs: string;
  profit: string;
  marginPct: string;
}

/** Filtros comunes: rango de fechas ya resuelto por el service. */
export interface ReportDateRange {
  userId: string;
  from: Date;
  to: Date;
}

export interface IReportRepository {
  getProfitSummary(filters: ReportDateRange): Promise<ProfitSummaryRow>;

  getProfitByProduct(
    filters: ReportDateRange & { limit: number }
  ): Promise<ProfitByProductRow[]>;
}
