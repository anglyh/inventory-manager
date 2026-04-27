import { BadRequestError } from '../errors/app.error.js';
import type { IReportRepository } from '../interfaces/repositories/report.repository.interface.js';
import type {
  IReportService,
  ProfitByProductResult,
  ProfitSummaryResult,
} from '../interfaces/services/report.service.interface.js';

const DEFAULT_RANGE_DAYS = 30;

export default class ReportService implements IReportService {
  constructor(private reportRepo: IReportRepository) {}

  async getProfitSummary(
    userId: string,
    params: { from?: Date | undefined; to?: Date | undefined }
  ): Promise<ProfitSummaryResult> {
    const { from, to } = this.resolveRange(params);
    const row = await this.reportRepo.getProfitSummary({ userId, from, to });
    return { from: from.toISOString(), to: to.toISOString(), ...row };
  }

  async getProfitByProduct(
    userId: string,
    params: { from?: Date | undefined; to?: Date | undefined; limit: number }
  ): Promise<ProfitByProductResult> {
    const { from, to } = this.resolveRange(params);
    const products = await this.reportRepo.getProfitByProduct({
      userId,
      from,
      to,
      limit: params.limit,
    });
    return { from: from.toISOString(), to: to.toISOString(), products };
  }

  /**
   * Calcula el rango efectivo a consultar:
   * - Si no se envía `from`, se asume hace DEFAULT_RANGE_DAYS días.
   * - Si no se envía `to`, se asume "ahora".
   * - `from` debe ser estrictamente menor que `to`.
   * El rango se interpreta como `[from, to)` (to exclusivo) en las queries.
   */
  private resolveRange(params: {
    from?: Date | undefined;
    to?: Date | undefined;
  }): { from: Date; to: Date } {
    const to = params.to ?? new Date();
    const from =
      params.from ??
      new Date(to.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);

    if (from.getTime() >= to.getTime()) {
      throw new BadRequestError('El rango "from" debe ser anterior a "to"');
    }

    return { from, to };
  }
}
