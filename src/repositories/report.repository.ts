import { query } from '../db/index.js';
import { VIEWS } from '../db/tables.js';
import type {
  CashDifferencesRow,
  DailySalesRow,
  IReportRepository,
  ProductLossRow,
  ProductRankingOrder,
  ProductRankingRow,
  ReportDateRange,
  ReportTotalsRow,
} from '../interfaces/repositories/report.repository.interface.js';
import { snakeToCamel } from '../utils/mapper.js';

/** Zona horaria del negocio: define a qué día pertenece cada venta. */
const BUSINESS_TIME_ZONE = 'America/Lima';

const LOSS_REASONS = `('LOSS_EXPIRED', 'LOSS_DAMAGED', 'COUNT_SHORTAGE', 'COUNT_SURPLUS')`;

/** Columnas de orden permitidas (evita interpolar input del cliente). */
const RANKING_ORDER: Record<ProductRankingOrder, string> = {
  quantity: 'SUM(quantity)',
  profit: 'SUM(profit)',
};

export default class ReportRepository implements IReportRepository {
  async getTotals(filters: ReportDateRange): Promise<ReportTotalsRow> {
    const { storeId, from, to } = filters;
    const text = `
      WITH sales AS (
        SELECT
          COALESCE(SUM(s.revenue), 0)                                               AS revenue,
          COALESCE(SUM(s.cogs), 0)                                                  AS cogs,
          COALESCE(SUM(s.revenue) FILTER (WHERE m.payment_method = 'CASH'), 0)      AS cash_sales,
          COALESCE(SUM(s.revenue) FILTER (WHERE m.payment_method = 'YAPE'), 0)      AS yape_sales,
          COUNT(DISTINCT s.movement_id)::int                                        AS sales_count
        FROM ${VIEWS.SALES_PROFIT} s
        JOIN inventory_movement m ON m.id = s.movement_id
        WHERE s.store_id = $1
          AND s.created_at >= $2
          AND s.created_at <  $3
      ),
      loss AS (
        SELECT
          COALESCE(SUM(mi.unit_cost * mi.quantity) FILTER (WHERE m.reason = 'LOSS_EXPIRED'), 0)   AS expired,
          COALESCE(SUM(mi.unit_cost * mi.quantity) FILTER (WHERE m.reason = 'LOSS_DAMAGED'), 0)   AS damaged,
          COALESCE(SUM(mi.unit_cost * mi.quantity) FILTER (WHERE m.reason = 'COUNT_SHORTAGE'), 0) AS count_shortage,
          COALESCE(SUM(mi.unit_cost * mi.quantity) FILTER (WHERE m.reason = 'COUNT_SURPLUS'), 0)  AS count_surplus
        FROM inventory_movement m
        JOIN inventory_movement_item mi ON mi.movement_id = m.id
        WHERE m.store_id = $1
          AND m.status = 'COMPLETED'
          AND m.reason IN ${LOSS_REASONS}
          AND m.created_at >= $2
          AND m.created_at <  $3
      ),
      totals AS (
        SELECT
          sales.*,
          loss.*,
          sales.revenue - sales.cogs                                                AS gross_profit,
          loss.expired + loss.damaged + loss.count_shortage - loss.count_surplus   AS losses
        FROM sales CROSS JOIN loss
      )
      SELECT
        ROUND(revenue, 2)::text                                                     AS revenue,
        ROUND(cogs, 2)::text                                                        AS cogs,
        ROUND(gross_profit, 2)::text                                                AS gross_profit,
        ROUND(losses, 2)::text                                                      AS losses,
        ROUND(gross_profit - losses, 2)::text                                       AS net_profit,
        ROUND(COALESCE((gross_profit - losses) / NULLIF(revenue, 0) * 100, 0), 2)::text AS margin_pct,
        sales_count,
        ROUND(COALESCE(revenue / NULLIF(sales_count, 0), 0), 2)::text               AS avg_ticket,
        ROUND(cash_sales, 2)::text                                                  AS cash_sales,
        ROUND(yape_sales, 2)::text                                                  AS yape_sales,
        ROUND(expired, 2)::text                                                     AS expired,
        ROUND(damaged, 2)::text                                                     AS damaged,
        ROUND(count_shortage, 2)::text                                              AS count_shortage,
        ROUND(count_surplus, 2)::text                                               AS count_surplus
      FROM totals
    `;
    const result = await query(text, [storeId, from, to]);
    return snakeToCamel(result.rows[0]);
  }

  async getCashDifferences(filters: ReportDateRange): Promise<CashDifferencesRow> {
    const { storeId, from, to } = filters;
    const text = `
      SELECT
        COUNT(*)::int                                                   AS closed_count,
        ROUND(COALESCE(SUM(-difference) FILTER (WHERE difference < 0), 0), 2)::text AS shortage,
        ROUND(COALESCE(SUM(difference)  FILTER (WHERE difference > 0), 0), 2)::text AS surplus,
        ROUND(COALESCE(SUM(difference), 0), 2)::text                    AS difference
      FROM (
        SELECT (closing_summary->>'difference')::numeric AS difference
        FROM cash_register
        WHERE store_id = $1
          AND closed_at >= $2
          AND closed_at <  $3
      ) closed
    `;
    const result = await query(text, [storeId, from, to]);
    return snakeToCamel(result.rows[0]);
  }

  /** Un registro por día del rango (también los días sin ventas). */
  async getDailySales(filters: ReportDateRange): Promise<DailySalesRow[]> {
    const { storeId, from, to } = filters;
    const text = `
      WITH days AS (
        SELECT generate_series(
          ($2::timestamptz AT TIME ZONE '${BUSINESS_TIME_ZONE}')::date,
          (($3::timestamptz - interval '1 millisecond') AT TIME ZONE '${BUSINESS_TIME_ZONE}')::date,
          interval '1 day'
        )::date AS day
      )
      SELECT
        to_char(d.day, 'YYYY-MM-DD')                    AS date,
        ROUND(COALESCE(SUM(s.revenue), 0), 2)::text     AS revenue,
        ROUND(COALESCE(SUM(s.profit), 0), 2)::text      AS profit
      FROM days d
      LEFT JOIN ${VIEWS.SALES_PROFIT} s
        ON s.store_id = $1
       AND s.created_at >= $2
       AND s.created_at <  $3
       AND (s.created_at AT TIME ZONE '${BUSINESS_TIME_ZONE}')::date = d.day
      GROUP BY d.day
      ORDER BY d.day
    `;
    const result = await query(text, [storeId, from, to]);
    return snakeToCamel(result.rows);
  }

  async getProductRanking(
    filters: ReportDateRange & { orderBy: ProductRankingOrder; limit: number }
  ): Promise<ProductRankingRow[]> {
    const { storeId, from, to, orderBy, limit } = filters;
    const text = `
      SELECT
        product_id,
        MAX(product_name)              AS product_name,
        SUM(quantity)::int             AS quantity,
        ROUND(SUM(revenue), 2)::text   AS revenue,
        ROUND(SUM(profit), 2)::text    AS profit
      FROM ${VIEWS.SALES_PROFIT}
      WHERE store_id = $1
        AND created_at >= $2
        AND created_at <  $3
      GROUP BY product_id
      ORDER BY ${RANKING_ORDER[orderBy]} DESC, MAX(product_name)
      LIMIT $4
    `;
    const result = await query(text, [storeId, from, to, limit]);
    return snakeToCamel(result.rows);
  }

  /** Pérdida neta por producto: los sobrantes de conteo restan. */
  async getTopLosses(filters: ReportDateRange & { limit: number }): Promise<ProductLossRow[]> {
    const { storeId, from, to, limit } = filters;
    const text = `
      SELECT
        mi.product_id,
        p.name                                            AS product_name,
        SUM(mi.quantity * sign.factor)::int               AS quantity,
        ROUND(SUM(mi.unit_cost * mi.quantity * sign.factor), 2)::text AS amount
      FROM inventory_movement m
      JOIN inventory_movement_item mi ON mi.movement_id = m.id
      JOIN product p ON p.id = mi.product_id
      CROSS JOIN LATERAL (
        SELECT CASE WHEN m.reason = 'COUNT_SURPLUS' THEN -1 ELSE 1 END AS factor
      ) sign
      WHERE m.store_id = $1
        AND m.status = 'COMPLETED'
        AND m.reason IN ${LOSS_REASONS}
        AND m.created_at >= $2
        AND m.created_at <  $3
      GROUP BY mi.product_id, p.name
      HAVING SUM(mi.unit_cost * mi.quantity * sign.factor) > 0
      ORDER BY SUM(mi.unit_cost * mi.quantity * sign.factor) DESC, p.name
      LIMIT $4
    `;
    const result = await query(text, [storeId, from, to, limit]);
    return snakeToCamel(result.rows);
  }
}
