import { BadRequestError } from '../errors/app.error.js';
import type { IReportRepository } from '../interfaces/repositories/report.repository.interface.js';
import type { IReportService } from '../interfaces/services/report.service.interface.js';
import type { ReportOverview } from '../schemas/report.schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;
/** Límite del rango: la serie diaria genera una fila por día. */
const MAX_RANGE_DAYS = 366;
const TOP_LIMIT = 5;
/** Tope de seguridad de la lista de productos; un catálogo de tienda rara vez lo alcanza. */
const PRODUCTS_LIMIT = 200;

export default class ReportService implements IReportService {
  constructor(private reportRepo: IReportRepository) {}

  async getOverview(
    storeId: string,
    params: {
      from?: Date | undefined;
      to?: Date | undefined;
      compareFrom?: Date | undefined;
      compareTo?: Date | undefined;
    }
  ): Promise<ReportOverview> {
    const range = { storeId, ...this.resolveRange(params) };
    const previousRange = { storeId, ...this.resolveCompareRange(range, params) };

    const [
      totals, previous, cash, daily, products, topLosses, flows, inventory, expensesByCategory, pendingMigrations,
    ] = await Promise.all([
      this.reportRepo.getTotals(range),
      this.reportRepo.getTotals(previousRange),
      this.reportRepo.getCashDifferences(range),
      this.reportRepo.getDailySales(range),
      this.reportRepo.getProducts({ ...range, limit: PRODUCTS_LIMIT }),
      this.reportRepo.getTopLosses({ ...range, limit: TOP_LIMIT }),
      this.reportRepo.getFlows(range),
      this.reportRepo.getInventorySnapshot(storeId),
      this.reportRepo.getExpensesByCategory(range),
      this.reportRepo.getPendingMigrationsCount(storeId),
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
      payments: { cash: totals.cashPayments, yape: totals.yapePayments },
      rooms: { revenue: totals.roomsRevenue, stays: totals.staysCount, occupancyPct: totals.occupancyPct },
      store: {
        revenue: totals.revenue,
        cogs: totals.cogs,
        grossProfit: totals.grossProfit,
        losses: totals.storeLosses,
        result: totals.storeResult,
      },
      lodging: { revenue: totals.roomsRevenue, costs: totals.lodgingCosts, result: totals.lodgingResult },
      total: {
        storeResult: totals.storeResult,
        lodgingResult: totals.lodgingResult,
        cashShortage: totals.cashShortage,
        cashShortageCount: totals.cashShortageCount,
        generalExpenses: totals.generalExpenses,
        netProfit: totals.netProfit,
      },
      expensesByCategory,
      cash,
      losses: {
        expired: totals.expired,
        damaged: totals.damaged,
        countShortage: totals.countShortage,
        countSurplus: totals.countSurplus,
        cashShortage: totals.cashShortage,
      },
      daily,
      products,
      topLosses,
      previous: {
        from: previousRange.from.toISOString(),
        to: previousRange.to.toISOString(),
        revenue: previous.revenue,
        grossProfit: previous.grossProfit,
        netProfit: previous.netProfit,
        salesCount: previous.salesCount,
        roomsRevenue: previous.roomsRevenue,
        storeResult: previous.storeResult,
        lodgingResult: previous.lodgingResult,
        generalExpenses: previous.generalExpenses,
      },
      flows,
      inventory,
      migrations: { pendingCount: pendingMigrations },
    };
  }

  /**
   * El cliente conoce la escala (p. ej. "1–13 oct" contra "1–13 sep") y puede enviar el rango.
   * Si no lo envía, se compara contra el mismo largo inmediatamente anterior: [from − largo, from).
   */
  private resolveCompareRange(
    range: { from: Date; to: Date },
    params: { compareFrom?: Date | undefined; compareTo?: Date | undefined }
  ): { from: Date; to: Date } {
    const { compareFrom, compareTo } = params;
    if (compareFrom && compareTo) return this.resolveRange({ from: compareFrom, to: compareTo });
    if (compareFrom || compareTo) {
      throw new BadRequestError('"compareFrom" y "compareTo" se envían juntos');
    }
    const length = range.to.getTime() - range.from.getTime();
    return { from: new Date(range.from.getTime() - length), to: range.from };
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
