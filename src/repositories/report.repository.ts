import { query } from '../db/index.js';
import { VIEWS } from '../db/tables.js';
import type {
  IReportRepository,
  ProfitByProductRow,
  ProfitSummaryRow,
  ReportDateRange,
} from '../interfaces/repositories/report.repository.interface.js';
import { snakeToCamel } from '../utils/mapper.js';

export default class ReportRepository implements IReportRepository {
  async getProfitSummary(filters: ReportDateRange): Promise<ProfitSummaryRow> {
    const { userId, from, to } = filters;
    const text = `
      SELECT
        COALESCE(SUM(revenue), 0)::text                            AS revenue,
        COALESCE(SUM(cogs),    0)::text                            AS cogs,
        COALESCE(SUM(profit),  0)::text                            AS profit,
        COALESCE(
          SUM(profit) / NULLIF(SUM(revenue), 0) * 100,
          0
        )::text                                                    AS margin_pct,
        COUNT(DISTINCT movement_id)::int                           AS sales_count,
        COALESCE(
          SUM(revenue) / NULLIF(COUNT(DISTINCT movement_id), 0),
          0
        )::text                                                    AS avg_ticket
      FROM ${VIEWS.SALES_PROFIT}
      WHERE user_id = $1
        AND created_at >= $2
        AND created_at <  $3
    `;
    const result = await query(text, [userId, from, to]);
    return snakeToCamel(result.rows[0]);
  }

  async getProfitByProduct(
    filters: ReportDateRange & { limit: number }
  ): Promise<ProfitByProductRow[]> {
    const { userId, from, to, limit } = filters;
    const text = `
      SELECT
        product_id,
        MAX(product_name)                                          AS product_name,
        SUM(quantity)::int                                         AS quantity_sold,
        SUM(revenue)::text                                         AS revenue,
        SUM(cogs)::text                                            AS cogs,
        SUM(profit)::text                                          AS profit,
        COALESCE(
          SUM(profit) / NULLIF(SUM(revenue), 0) * 100,
          0
        )::text                                                    AS margin_pct
      FROM ${VIEWS.SALES_PROFIT}
      WHERE user_id = $1
        AND created_at >= $2
        AND created_at <  $3
      GROUP BY product_id
      ORDER BY SUM(profit) DESC
      LIMIT $4
    `;
    const result = await query(text, [userId, from, to, limit]);
    return snakeToCamel(result.rows);
  }
}
