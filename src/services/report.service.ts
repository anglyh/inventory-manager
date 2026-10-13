import { BadRequestError } from '../errors/app.error.js';
import type { IReportRepository } from '../interfaces/repositories/report.repository.interface.js';
import type { IReportService } from '../interfaces/services/report.service.interface.js';
import type { ReportOverview } from '../schemas/report.schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;
/** Límite del rango: la serie diaria genera una fila por día. */
const MAX_RANGE_DAYS = 366;
const TOP_LIMIT = 5;

export default class ReportService implements IReportService {
  constructor(private reportRepo: IReportRepository) {}

  async getOverview(
    storeId: string,
    params: { from?: Date | undefined; to?: Date | undefined }
  ): Promise<ReportOverview> {
    const range = { storeId, ...this.resolveRange(params) };

    const [totals, cash, daily, topSold, topProfit, topLosses] = await Promise.all([
      this.reportRepo.getTotals(range),
      this.reportRepo.getCashDifferences(range),
      this.reportRepo.getDailySales(range),
      this.reportRepo.getProductRanking({ ...range, orderBy: 'quantity', limit: TOP_LIMIT }),
      this.reportRepo.getProductRanking({ ...range, orderBy: 'profit', limit: TOP_LIMIT }),
      this.reportRepo.getTopLosses({ ...range, limit: TOP_LIMIT }),
    ]);

    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      summary: {
        revenue: totals.revenue,
        cogs: totals.cogs,
        grossProfit: totals.grossProfit,
        losses: totals.losses,
        netProfit: totals.netProfit,
        marginPct: totals.marginPct,
        salesCount: totals.salesCount,
        avgTicket: totals.avgTicket,
      },
      payments: { cash: totals.cashSales, yape: totals.yapeSales },
      cash,
      losses: {
        expired: totals.expired,
        damaged: totals.damaged,
        countShortage: totals.countShortage,
        countSurplus: totals.countSurplus,
      },
      daily,
      topSold,
      topProfit,
      topLosses,
    };
  }

  /**
   * Calcula el rango efectivo a consultar:
   * - Si no se envía `from`, se asume hace DEFAULT_RANGE_DAYS días.
   * - Si no se envía `to`, se asume "ahora".
   * - `from` debe ser estrictamente menor que `to` y el rango no puede superar MAX_RANGE_DAYS.
   * El rango se interpreta como `[from, to)` (to exclusivo) en las queries.
   */
  private resolveRange(params: {
    from?: Date | undefined;
    to?: Date | undefined;
  }): { from: Date; to: Date } {
    const to = params.to ?? new Date();
    const from = params.from ?? new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);

    if (from.getTime() >= to.getTime()) {
      throw new BadRequestError('El rango "from" debe ser anterior a "to"');
    }

    if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_MS) {
      throw new BadRequestError(`El rango no puede superar los ${MAX_RANGE_DAYS} días`);
    }

    return { from, to };
  }
}
