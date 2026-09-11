import type {
  ProfitByProductRow,
  ProfitSummaryRow,
} from '../repositories/report.repository.interface.js';

/** Envoltorio de respuesta que incluye el rango efectivo consultado. */
export interface DateRangeEnvelope {
  from: string; // ISO
  to: string;   // ISO (exclusivo)
}

export interface ProfitSummaryResult extends DateRangeEnvelope, ProfitSummaryRow {}

export interface ProfitByProductResult extends DateRangeEnvelope {
  products: ProfitByProductRow[];
}

export interface IReportService {
  getProfitSummary(
    storeId: string,
    params: { from?: Date | undefined; to?: Date | undefined }
  ): Promise<ProfitSummaryResult>;

  getProfitByProduct(
    storeId: string,
    params: { from?: Date | undefined; to?: Date | undefined; limit: number }
  ): Promise<ProfitByProductResult>;
}
