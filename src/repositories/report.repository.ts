import { query } from '../db/index.js';
import { VIEWS } from '../db/tables.js';
import { pendingMigrations } from './sql.js';
import type {
  DailySalesRow,
  FlowsRow,
  IReportRepository,
  InventorySnapshotRow,
  ProductRankingRow,
  ReportDateRange,
  ReportTotalsRow,
} from '../interfaces/repositories/report.repository.interface.js';
import { snakeToCamel } from '../utils/mapper.js';

/** Zona horaria del negocio: define a qué día pertenece cada venta. */
const BUSINESS_TIME_ZONE = 'America/Lima';

const LOSS_REASONS = `('LOSS_EXPIRED', 'LOSS_DAMAGED', 'COUNT_SHORTAGE', 'COUNT_SURPLUS')`;

/**
 * Los gastos se guardan por día de Lima: el rango [$2, $3) se convierte a días de Lima,
 * igual que la serie diaria.
 */
const EXPENSE_IN_RANGE = `
  e.store_id = $1
  AND e.spent_on >= ($2::timestamptz AT TIME ZONE '${BUSINESS_TIME_ZONE}')::date
  AND e.spent_on <= (($3::timestamptz - interval '1 millisecond') AT TIME ZONE '${BUSINESS_TIME_ZONE}')::date
`;

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
      -- Descuadres al cerrar caja: el faltante resta de la ganancia y el sobrante la compensa.
      register AS (
        SELECT
          COALESCE(SUM(-(closing_summary->>'difference')::numeric)
            FILTER (WHERE (closing_summary->>'difference')::numeric < 0), 0)       AS cash_shortage,
          COALESCE(SUM((closing_summary->>'difference')::numeric)
            FILTER (WHERE (closing_summary->>'difference')::numeric > 0), 0)       AS cash_surplus,
          COUNT(*) FILTER (WHERE (closing_summary->>'difference')::numeric < 0)::int AS cash_shortage_count
        FROM cash_register
        WHERE store_id = $1
          AND closed_at >= $2
          AND closed_at <  $3
      ),
      -- Cobros de habitaciones del período (por fecha de pago). No tienen costo de mercadería.
      rooms AS (
        SELECT
          COALESCE(SUM(p.amount), 0)                                                AS rooms_revenue,
          COALESCE(SUM(p.amount) FILTER (WHERE p.payment_method = 'CASH'), 0)      AS cash_rooms,
          COALESCE(SUM(p.amount) FILTER (WHERE p.payment_method = 'YAPE'), 0)      AS yape_rooms
        FROM stay_payment p
        JOIN stay st ON st.id = p.stay_id
        WHERE st.store_id = $1
          AND p.created_at >= $2
          AND p.created_at <  $3
      ),
      -- Gastos: LODGING es costo del hospedaje; GENERAL resta de la ganancia neta.
      expenses AS (
        SELECT
          COALESCE(SUM(e.amount) FILTER (WHERE c.expense_group = 'LODGING'), 0)     AS lodging_costs,
          COALESCE(SUM(e.amount) FILTER (WHERE c.expense_group = 'GENERAL'), 0)     AS general_expenses
        FROM expense e
        JOIN expense_category c ON c.id = e.category_id
        WHERE ${EXPENSE_IN_RANGE}
      ),
      stays AS (
        SELECT COUNT(*)::int                                                        AS stays_count
        FROM stay
        WHERE store_id = $1
          AND check_in_at >= $2
          AND check_in_at <  $3
      ),
      -- Ocupación: horas ocupadas dentro del período sobre (habitaciones activas × horas transcurridas).
      occupancy AS (
        SELECT
          COALESCE(SUM(EXTRACT(EPOCH FROM
            LEAST(COALESCE(st.actual_check_out, now()), $3::timestamptz, now())
            - GREATEST(st.check_in_at, $2::timestamptz)
          )), 0)                                                                    AS occupied_seconds,
          GREATEST(EXTRACT(EPOCH FROM LEAST($3::timestamptz, now()) - $2::timestamptz), 0)
            * (SELECT COUNT(*) FROM room WHERE store_id = $1 AND is_active)         AS available_seconds
        FROM stay st
        WHERE st.store_id = $1
          AND st.check_in_at < LEAST($3::timestamptz, now())
          AND COALESCE(st.actual_check_out, now()) > $2
      ),
      totals AS (
        SELECT
          sales.*,
          loss.*,
          register.*,
          rooms.*,
          expenses.*,
          stays.*,
          occupancy.*,
          sales.revenue - sales.cogs                                                AS gross_profit,
          -- Solo mercadería: vencidos, dañados y faltantes de conteo. Los sobrantes van aparte.
          loss.expired + loss.damaged + loss.count_shortage                         AS store_losses
        FROM sales CROSS JOIN loss CROSS JOIN register
          CROSS JOIN rooms CROSS JOIN expenses CROSS JOIN stays CROSS JOIN occupancy
      ),
      results AS (
        SELECT
          totals.*,
          gross_profit - store_losses + count_surplus                               AS store_result,
          rooms_revenue - lodging_costs                                             AS lodging_result,
          -- Resultado de cada negocio, más la diferencia neta de caja, menos los gastos generales.
          gross_profit - store_losses + count_surplus + rooms_revenue - lodging_costs
            - cash_shortage + cash_surplus - general_expenses                       AS net
        FROM totals
      )
      SELECT
        ROUND(revenue, 2)::text                                                     AS revenue,
        ROUND(cogs, 2)::text                                                        AS cogs,
        ROUND(gross_profit, 2)::text                                                AS gross_profit,
        ROUND(net, 2)::text                                                         AS net_profit,
        ROUND(COALESCE(net / NULLIF(revenue + rooms_revenue, 0) * 100, 0), 2)::text AS margin_pct,
        ROUND(store_losses, 2)::text                                                AS store_losses,
        ROUND(store_result, 2)::text                                                AS store_result,
        ROUND(lodging_costs, 2)::text                                               AS lodging_costs,
        ROUND(lodging_result, 2)::text                                              AS lodging_result,
        ROUND(general_expenses, 2)::text                                            AS general_expenses,
        sales_count,
        ROUND(COALESCE(revenue / NULLIF(sales_count, 0), 0), 2)::text               AS avg_ticket,
        ROUND(count_surplus, 2)::text                                               AS count_surplus,
        ROUND(cash_shortage, 2)::text                                               AS cash_shortage,
        ROUND(cash_surplus, 2)::text                                                AS cash_surplus,
        cash_shortage_count,
        ROUND(cash_sales + cash_rooms, 2)::text                                     AS cash_payments,
        ROUND(yape_sales + yape_rooms, 2)::text                                     AS yape_payments,
        ROUND(rooms_revenue, 2)::text                                               AS rooms_revenue,
        stays_count,
        ROUND(LEAST(COALESCE(occupied_seconds / NULLIF(available_seconds, 0) * 100, 0), 100), 2)::text AS occupancy_pct
      FROM results
    `;
    const result = await query(text, [storeId, from, to]);
    return snakeToCamel(result.rows[0]);
  }

  /**
   * Un registro por día del rango (también los días sin ventas). rooms son los cobros de habitaciones del día
   * y lodging_result esos cobros menos los gastos del hospedaje del día.
   */
  async getDailySales(filters: ReportDateRange): Promise<DailySalesRow[]> {
    const { storeId, from, to } = filters;
    const text = `
      WITH days AS (
        SELECT generate_series(
          ($2::timestamptz AT TIME ZONE '${BUSINESS_TIME_ZONE}')::date,
          (($3::timestamptz - interval '1 millisecond') AT TIME ZONE '${BUSINESS_TIME_ZONE}')::date,
          interval '1 day'
        )::date AS day
      ),
      sales AS (
        SELECT
          (s.created_at AT TIME ZONE '${BUSINESS_TIME_ZONE}')::date AS day,
          SUM(s.revenue)                                  AS revenue,
          SUM(s.profit)                                   AS profit
        FROM ${VIEWS.SALES_PROFIT} s
        WHERE s.store_id = $1
          AND s.created_at >= $2
          AND s.created_at <  $3
        GROUP BY 1
      ),
      rooms AS (
        SELECT
          (p.created_at AT TIME ZONE '${BUSINESS_TIME_ZONE}')::date AS day,
          SUM(p.amount)                                   AS rooms
        FROM stay_payment p
        JOIN stay st ON st.id = p.stay_id
        WHERE st.store_id = $1
          AND p.created_at >= $2
          AND p.created_at <  $3
        GROUP BY 1
      ),
      lodging AS (
        SELECT
          e.spent_on                                      AS day,
          SUM(e.amount)                                   AS costs
        FROM expense e
        JOIN expense_category c ON c.id = e.category_id
        WHERE ${EXPENSE_IN_RANGE}
          AND c.expense_group = 'LODGING'
        GROUP BY 1
      )
      SELECT
        to_char(d.day, 'YYYY-MM-DD')                    AS date,
        ROUND(COALESCE(s.revenue, 0), 2)::text          AS revenue,
        ROUND(COALESCE(s.profit, 0), 2)::text           AS profit,
        ROUND(COALESCE(r.rooms, 0), 2)::text            AS rooms,
        ROUND(COALESCE(r.rooms, 0) - COALESCE(l.costs, 0), 2)::text AS lodging_result
      FROM days d
      LEFT JOIN sales s ON s.day = d.day
      LEFT JOIN rooms r ON r.day = d.day
      LEFT JOIN lodging l ON l.day = d.day
      ORDER BY d.day
    `;
    const result = await query(text, [storeId, from, to]);
    return snakeToCamel(result.rows);
  }

  /** Todos los productos vendidos en el rango (con tope de seguridad): el cliente los ordena. */
  async getProducts(filters: ReportDateRange & { limit: number }): Promise<ProductRankingRow[]> {
    const { storeId, from, to, limit } = filters;
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
      ORDER BY SUM(revenue) DESC, MAX(product_name)
      LIMIT $4
    `;
    const result = await query(text, [storeId, from, to, limit]);
    return snakeToCamel(result.rows);
  }

  /** Mercadería comprada en el rango: sale dinero, pero no es gasto (pasa al stock). */
  async getFlows(filters: ReportDateRange): Promise<FlowsRow> {
    const { storeId, from, to } = filters;
    const text = `
      SELECT ROUND(COALESCE(SUM(mi.unit_cost * mi.quantity), 0), 2)::text AS purchases
      FROM inventory_movement m
      JOIN inventory_movement_item mi ON mi.movement_id = m.id
      WHERE m.store_id = $1
        AND m.reason = 'PURCHASE'
        AND m.status = 'COMPLETED'
        AND m.created_at >= $2
        AND m.created_at <  $3
    `;
    const result = await query(text, [storeId, from, to]);
    return snakeToCamel(result.rows[0]);
  }

  /** Foto actual: no depende del rango consultado. */
  async getInventorySnapshot(storeId: string): Promise<InventorySnapshotRow> {
    const text = `
      SELECT
        ROUND(COALESCE(SUM(GREATEST(stock, 0) * COALESCE(unit_cost_avg, 0)), 0), 2)::text AS value,
        COUNT(*) FILTER (WHERE is_active AND stock <= min_stock)::int                    AS low_stock_count
      FROM ${VIEWS.PRODUCT_WITH_STOCK}
      WHERE store_id = $1
    `;
    const lowStockText = `
      SELECT id AS product_id, name AS product_name, stock::int, min_stock
      FROM ${VIEWS.PRODUCT_WITH_STOCK}
      WHERE store_id = $1 AND is_active AND stock <= min_stock
      ORDER BY stock - min_stock, name
      LIMIT 5
    `;
    const [totals, lowStock] = await Promise.all([
      query(text, [storeId]),
      query(lowStockText, [storeId]),
    ]);
    return { ...snakeToCamel(totals.rows[0]), lowStockProducts: snakeToCamel(lowStock.rows) };
  }

  /** Foto actual, abiertas o cerradas: no depende del rango consultado. */
  async getPendingMigrationsCount(storeId: string): Promise<number> {
    const text = `
      SELECT COUNT(*)::int AS pending_count
      FROM stay AS st
      WHERE st.store_id = $1
        AND ${pendingMigrations('st')}
    `;
    const result = await query(text, [storeId]);
    return Number(result.rows[0]?.pending_count ?? 0);
  }
}
