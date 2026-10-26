import type { PoolClient } from 'pg';
import { query } from '../db/index.js';
import type { ExpenseForDelete, IExpenseRepository } from '../interfaces/repositories/expense.repository.interface.js';
import type {
  CreateExpenseCategoryDTO,
  CreateExpenseDTO,
  Expense,
  ExpenseCategory,
  ExpenseListQueryDTO,
  UpdateExpenseCategoryDTO,
} from '../schemas/expense.schema.js';
import { snakeToCamel } from '../utils/mapper.js';
import { buildSet, isoTimestamp } from './sql.js';

/** Zona horaria del negocio: el gasto se guarda con el día de Lima al que corresponde. */
const BUSINESS_TIME_ZONE = 'America/Lima';

const CATEGORY_COLUMNS = {
  name: 'name',
  group: 'expense_group',
  isActive: 'is_active',
};

const selectCategory = `
SELECT
  id, name, expense_group AS "group", is_active,
  (SELECT count(*)::int FROM expense WHERE expense.category_id = expense_category.id) AS expense_count,
  ${isoTimestamp('created_at')} AS created_at
FROM expense_category
`;

const selectExpense = `
SELECT
  e.id,
  e.category_id,
  c.name AS category_name,
  c.expense_group AS "group",
  e.amount,
  to_char(e.spent_on, 'YYYY-MM-DD') AS spent_on,
  e.description,
  e.source,
  cm.cash_register_id,
  (e.source = 'OUTSIDE' OR cr.closed_at IS NULL) AS can_delete,
  e.created_by,
  creator.name AS created_by_name,
  ${isoTimestamp('e.created_at')} AS created_at
FROM expense AS e
JOIN expense_category AS c ON c.id = e.category_id
LEFT JOIN cash_register_movement AS cm ON cm.id = e.cash_movement_id
LEFT JOIN cash_register AS cr ON cr.id = cm.cash_register_id
LEFT JOIN app_user AS creator ON creator.id = e.created_by
`;

export default class ExpenseRepository implements IExpenseRepository {
  async listCategories(storeId: string): Promise<ExpenseCategory[]> {
    const result = await query(
      `${selectCategory} WHERE store_id = $1 ORDER BY is_active DESC, expense_group, lower(name)`,
      [storeId],
    );
    return snakeToCamel(result.rows);
  }

  async findCategoryById(storeId: string, id: string): Promise<ExpenseCategory | null> {
    const result = await query(`${selectCategory} WHERE store_id = $1 AND id = $2`, [storeId, id]);
    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async createCategory(storeId: string, data: CreateExpenseCategoryDTO): Promise<string> {
    const result = await query(
      'INSERT INTO expense_category (store_id, name, expense_group) VALUES ($1, $2, $3) RETURNING id',
      [storeId, data.name, data.group],
    );
    return result.rows[0].id;
  }

  async updateCategory(storeId: string, id: string, data: UpdateExpenseCategoryDTO): Promise<void> {
    const { set, params } = buildSet(data, CATEGORY_COLUMNS, 2);
    if (!set) return;
    await query(`UPDATE expense_category SET ${set} WHERE store_id = $1 AND id = $2`, [storeId, id, ...params]);
  }

  async deleteCategory(storeId: string, id: string): Promise<boolean> {
    const result = await query('DELETE FROM expense_category WHERE store_id = $1 AND id = $2', [storeId, id]);
    return (result.rowCount ?? 0) > 0;
  }

  async list(
    storeId: string,
    filters: ExpenseListQueryDTO,
  ): Promise<{ data: Expense[]; total: number; totalAmount: string }> {
    const params: unknown[] = [storeId];
    const conditions = ['e.store_id = $1'];
    // El rango [from, to) se convierte a días de Lima, igual que la serie diaria del reporte.
    if (filters.from) {
      params.push(filters.from);
      conditions.push(`e.spent_on >= ($${params.length}::timestamptz AT TIME ZONE '${BUSINESS_TIME_ZONE}')::date`);
    }
    if (filters.to) {
      params.push(filters.to);
      conditions.push(
        `e.spent_on <= (($${params.length}::timestamptz - interval '1 millisecond') AT TIME ZONE '${BUSINESS_TIME_ZONE}')::date`,
      );
    }
    if (filters.categoryId) {
      params.push(filters.categoryId);
      conditions.push(`e.category_id = $${params.length}`);
    }
    if (filters.group) {
      params.push(filters.group);
      conditions.push(`c.expense_group = $${params.length}`);
    }
    const whereClause = conditions.join('\n        AND ');
    const countParams = [...params];
    params.push(filters.limit, (filters.page - 1) * filters.limit);

    const [page, totals] = await Promise.all([
      query(
        `${selectExpense}
         WHERE ${whereClause}
         ORDER BY e.spent_on DESC, e.created_at DESC, e.id DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      query(
        `SELECT COUNT(*)::int AS total, ROUND(COALESCE(SUM(e.amount), 0), 2)::text AS total_amount
         FROM expense AS e
         JOIN expense_category AS c ON c.id = e.category_id
         WHERE ${whereClause}`,
        countParams,
      ),
    ]);

    return {
      data: snakeToCamel(page.rows),
      total: totals.rows[0].total,
      totalAmount: totals.rows[0].total_amount,
    };
  }

  async findById(storeId: string, id: string): Promise<Expense | null> {
    const result = await query(`${selectExpense} WHERE e.store_id = $1 AND e.id = $2`, [storeId, id]);
    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async create(
    storeId: string,
    userId: string,
    data: CreateExpenseDTO & { cashMovementId: string | null },
    client: PoolClient,
  ): Promise<string> {
    const result = await client.query<{ id: string }>(
      `INSERT INTO expense (store_id, category_id, amount, spent_on, description, source, cash_movement_id, created_by)
       VALUES ($1, $2, $3, COALESCE($4::date, (now() AT TIME ZONE '${BUSINESS_TIME_ZONE}')::date), $5, $6, $7, $8)
       RETURNING id`,
      [
        storeId,
        data.categoryId,
        data.amount,
        data.spentOn ?? null,
        data.description || null,
        data.source,
        data.cashMovementId,
        userId,
      ],
    );
    return result.rows[0]!.id;
  }

  async lockForDelete(storeId: string, id: string, client: PoolClient): Promise<ExpenseForDelete | null> {
    const result = await client.query(
      `SELECT
         e.id,
         e.source,
         e.cash_movement_id,
         (SELECT cm.cash_register_id FROM cash_register_movement AS cm WHERE cm.id = e.cash_movement_id) AS cash_register_id
       FROM expense AS e
       WHERE e.store_id = $1 AND e.id = $2
       FOR UPDATE`,
      [storeId, id],
    );
    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async delete(expense: ExpenseForDelete, client: PoolClient): Promise<void> {
    // Primero el gasto: es el que referencia al movimiento de caja.
    await client.query('DELETE FROM expense WHERE id = $1', [expense.id]);
    if (expense.cashMovementId) {
      await client.query('DELETE FROM cash_register_movement WHERE id = $1', [expense.cashMovementId]);
    }
  }
}
