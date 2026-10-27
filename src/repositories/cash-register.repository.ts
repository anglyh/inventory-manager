import type { PoolClient } from 'pg';
import { query } from '../db/index.js';
import { ConflictError, NotFoundError } from '../errors/app.error.js';
import type { ICashRegisterRepository } from '../interfaces/repositories/cash-register.repository.interface.js';
import type {
  CashRegister,
  CashRegisterMovement,
  CashRegisterView,
} from '../models/cash-register.model.js';
import type {
  CashMovementDTO,
  CashMovementHistoryDTO,
  CashRegisterHistoryDTO,
  CloseCashRegisterDTO,
  OpenCashRegisterDTO,
} from '../schemas/cash-register.schema.js';
import { snakeToCamel } from '../utils/mapper.js';

// t siempre es vw_cash_register_totals. Los importes se calculan en PostgreSQL.
const summaryJson = (difference: string) => `jsonb_build_object(
  'cashSales', t.cash_sales::text,
  'yapeSales', t.yape_sales::text,
  'totalSales', t.total_sales::text,
  'salesCount', t.sales_count,
  'cashStays', t.cash_stays::text,
  'yapeStays', t.yape_stays::text,
  'cashIn', t.cash_in::text,
  'cashOut', t.cash_out::text,
  'expectedCash', t.expected_cash::text,
  'difference', ${difference}
)`;

// Cierre ciego (GUEST): solo la cantidad de ventas. Ningún importe, porque fondo + ventas
// en efectivo + habitaciones + aportes − retiros reconstruye el efectivo esperado.
const openSummary = (view: CashRegisterView) =>
  view === 'blind' ? "jsonb_build_object('salesCount', t.sales_count)" : summaryJson('NULL');
const closedSummary = (view: CashRegisterView) => view === 'blind'
  ? "CASE WHEN cr.closing_summary IS NULL THEN NULL ELSE jsonb_build_object('salesCount', cr.closing_summary -> 'salesCount') END"
  : 'cr.closing_summary';

const selectRegister = (view: CashRegisterView = 'full', includeTotal = false) => `
SELECT
  cr.id,
  ${includeTotal ? 'COUNT(*) OVER() AS total_count,' : ''}
  to_char(cr.opened_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS opened_at,
  cr.opening_amount,
  cr.opened_by,
  opened_user.name AS opened_by_name,
  cr.notes,
  to_char(cr.closed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS closed_at,
  cr.closing_amount,
  cr.closed_by,
  closed_user.name AS closed_by_name,
  cr.closing_notes,
  CASE
    WHEN cr.closed_at IS NULL THEN 'OPEN'
    ELSE 'CLOSED'
  END AS status,
  CASE
    WHEN cr.closed_at IS NULL THEN ${openSummary(view)}
    ELSE ${closedSummary(view)}
  END AS summary
FROM cash_register AS cr
JOIN vw_cash_register_totals AS t
  ON t.cash_register_id = cr.id
LEFT JOIN app_user AS opened_user ON opened_user.id = cr.opened_by
LEFT JOIN app_user AS closed_user ON closed_user.id = cr.closed_by
`;

export default class CashRegisterRepository implements ICashRegisterRepository {
  async create(
    storeId: string,
    userId: string,
    data: OpenCashRegisterDTO,
    client: PoolClient,
  ): Promise<string> {
    const sql = `
      INSERT INTO cash_register (
        store_id,
        opening_amount,
        opened_by,
        notes
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (store_id) WHERE closed_at IS NULL
        DO NOTHING
      RETURNING id
    `;
    const params = [storeId, data.openingAmount, userId, data.notes ?? null];
    const result = await client.query<{ id: string }>(sql, params);

    if (!result.rows[0]) {
      throw new ConflictError('Ya existe una caja abierta en esta tienda');
    }

    return result.rows[0].id;
  }

  async lockOpen(
    storeId: string,
    id: string | undefined,
    client: PoolClient,
    missingMessage = 'Debe abrir una caja antes de registrar una venta',
  ): Promise<string> {
    const registerCondition = id ? 'id = $2' : 'closed_at IS NULL';
    const sql = `
      SELECT
        id,
        closed_at
      FROM cash_register
      WHERE store_id = $1
        AND ${registerCondition}
      FOR UPDATE
    `;
    const params = id ? [storeId, id] : [storeId];
    const result = await client.query<{ id: string; closed_at: Date | null }>(sql, params);
    const row = result.rows[0];

    if (!row) {
      if (id) {
        throw new NotFoundError('La caja no existe');
      }

      throw new ConflictError(missingMessage);
    }
    if (row.closed_at) {
      throw new ConflictError('La caja está cerrada');
    }

    return row.id;
  }

  async findCurrent(storeId: string, view: CashRegisterView = 'full'): Promise<CashRegister | null> {
    const sql = `
      ${selectRegister(view)}
      WHERE cr.store_id = $1
        AND cr.closed_at IS NULL
    `;
    const result = await query(sql, [storeId]);

    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async findById(storeId: string, id: string, view: CashRegisterView = 'full'): Promise<CashRegister | null> {
    const sql = `
      ${selectRegister(view)}
      WHERE cr.store_id = $1
        AND cr.id = $2
    `;
    const result = await query(sql, [storeId, id]);

    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async list(
    storeId: string,
    filters: CashRegisterHistoryDTO,
    view: CashRegisterView = 'full',
  ): Promise<{ data: CashRegister[]; total: number }> {
    const params: unknown[] = [storeId];
    const conditions = ['cr.store_id = $1'];

    if (filters.status) {
      conditions.push(
        filters.status === 'OPEN'
          ? 'cr.closed_at IS NULL'
          : 'cr.closed_at IS NOT NULL',
      );
    }

    const whereClause = conditions.join('\n        AND ');
    const countParams = [...params];
    params.push(filters.limit, (filters.page - 1) * filters.limit);

    const pagedSql = `
      ${selectRegister(view, true)}
      WHERE ${whereClause}
      ORDER BY cr.opened_at DESC, cr.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const result = await query(pagedSql, params);

    let total: number;
    if (result.rows.length) {
      total = Number(result.rows[0].total_count);
    } else {
      const countResult = await query(`
        SELECT COUNT(*) AS total
        FROM cash_register AS cr
        WHERE ${whereClause}
      `, countParams);
      total = Number(countResult.rows[0]?.total ?? 0);
    }

    const data = result.rows.map(({ total_count: _totalCount, ...row }) => row);
    return { data: snakeToCamel(data), total };
  }

  async listMovements(
    storeId: string,
    id: string,
    filters: CashMovementHistoryDTO,
  ): Promise<{ data: CashRegisterMovement[]; total: number }> {
    const params: unknown[] = [storeId, id, filters.limit, (filters.page - 1) * filters.limit];
    const whereClause = 'cr.store_id = $1 AND cr.id = $2';

    const sql = `
      SELECT
        cm.id,
        cm.cash_register_id,
        cm.type,
        cm.amount,
        cm.reason,
        cm.created_by,
        creator.name AS created_by_name,
        to_char(cm.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at,
        COUNT(*) OVER() AS total_count
      FROM cash_register_movement AS cm
      JOIN cash_register AS cr
        ON cr.id = cm.cash_register_id
      LEFT JOIN app_user AS creator ON creator.id = cm.created_by
      WHERE ${whereClause}
      ORDER BY cm.created_at DESC, cm.id DESC
      LIMIT $3 OFFSET $4
    `;
    const result = await query(sql, params);
    let total: number;
    if (result.rows.length) {
      total = Number(result.rows[0].total_count);
    } else {
      const countResult = await query(`
        SELECT COUNT(*) AS total
        FROM cash_register_movement AS cm
        JOIN cash_register AS cr ON cr.id = cm.cash_register_id
        WHERE ${whereClause}
      `, params.slice(0, 2));
      total = Number(countResult.rows[0]?.total ?? 0);
    }

    const data = result.rows.map(({ total_count: _totalCount, ...row }) => row);
    return { data: snakeToCamel(data), total };
  }

  async addMovement(
    id: string,
    userId: string,
    data: CashMovementDTO,
    client: PoolClient,
  ): Promise<string> {
    const sql = `
      INSERT INTO cash_register_movement (
        cash_register_id,
        type,
        amount,
        reason,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const params = [id, data.type, data.amount, data.reason, userId];

    const result = await client.query<{ id: string }>(sql, params);
    return result.rows[0]!.id;
  }

  async canWithdraw(
    id: string,
    amount: number,
    client: PoolClient,
  ): Promise<boolean> {
    const sql = `
      SELECT expected_cash >= $2::numeric AS allowed
      FROM vw_cash_register_totals
      WHERE cash_register_id = $1
    `;
    const result = await client.query<{ allowed: boolean }>(sql, [id, amount]);

    return result.rows[0]?.allowed === true;
  }

  async hasClosingDifference(
    id: string,
    amount: number,
    client: PoolClient,
  ): Promise<boolean> {
    const sql = `
      SELECT expected_cash <> $2::numeric AS differs
      FROM vw_cash_register_totals
      WHERE cash_register_id = $1
    `;
    const result = await client.query<{ differs: boolean }>(sql, [id, amount]);

    if (!result.rows[0]) {
      throw new NotFoundError('La caja no existe');
    }

    return result.rows[0].differs;
  }

  async close(
    id: string,
    userId: string,
    data: CloseCashRegisterDTO,
    client: PoolClient,
  ): Promise<void> {
    const closingSummary = summaryJson('($2::numeric(10, 2) - t.expected_cash)::text');
    const sql = `
      UPDATE cash_register AS cr
      SET
        closed_at = clock_timestamp(),
        closing_amount = $2,
        closed_by = $3,
        closing_notes = $4,
        closing_summary = ${closingSummary}
      FROM vw_cash_register_totals AS t
      WHERE cr.id = $1
        AND t.cash_register_id = cr.id
        AND cr.closed_at IS NULL
    `;
    const params = [id, data.closingAmount, userId, data.notes || null];

    await client.query(sql, params);
  }
}
