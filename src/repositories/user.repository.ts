import { query } from '../db/index.js';
import { TABLES } from '../db/tables.js';
import type { User, StoreUser } from '../models/user.model.js';
import { snakeToCamel } from '../utils/mapper.js';
import type { IUserRepository } from '../interfaces/repositories/user.repository.interface.js';
import { DEFAULT_EXPENSE_CATEGORIES } from '../schemas/expense.schema.js';

export default class UserRepository implements IUserRepository {
  async listStoreUsers(storeId: string): Promise<StoreUser[]> {
    const result = await query(`
      SELECT id, name, email, role, active FROM app_user
      WHERE store_id = $1 ORDER BY name, id
    `, [storeId]);
    return snakeToCamel(result.rows);
  }

  async createStoreUser(storeId: string, name: string, email: string, password: string): Promise<StoreUser> {
    const result = await query(`
      INSERT INTO app_user (store_id, name, email, password, role)
      VALUES ($1, $2, $3, $4, 'GUEST')
      RETURNING id, name, email, role, active
    `, [storeId, name, email, password]);
    return snakeToCamel(result.rows[0]);
  }

  /** Only GUEST users of the same store: an admin can never be deactivated, not even by themselves. */
  async setStoreUserActive(storeId: string, id: string, active: boolean): Promise<StoreUser | null> {
    const result = await query(`
      UPDATE app_user SET active = $3
      WHERE store_id = $1 AND id = $2 AND role = 'GUEST'
      RETURNING id, name, email, role, active
    `, [storeId, id, active]);
    return result.rows.length ? snakeToCamel(result.rows[0]) : null;
  }

  async create(storeName: string, name: string, email: string, password: string): Promise<User> {
    const result = await query(
      `WITH new_store AS (
        INSERT INTO ${TABLES.STORE} (name)
        VALUES ($1)
        RETURNING id
      ),
      -- La tienda nueva empieza con las categorías de gasto por defecto.
      default_expense_categories AS (
        INSERT INTO expense_category (store_id, name, expense_group)
        SELECT new_store.id, c.name, c.expense_group
        FROM new_store, unnest($5::text[], $6::expense_group[]) AS c(name, expense_group)
      )
      INSERT INTO ${TABLES.USER} (store_id, name, email, password, role)
      VALUES ((SELECT id FROM new_store), $2, $3, $4, 'ADMIN')
      RETURNING *;
      `, [
        storeName, name, email, password,
        DEFAULT_EXPENSE_CATEGORIES.map(c => c.name),
        DEFAULT_EXPENSE_CATEGORIES.map(c => c.group),
      ]
    );

    return snakeToCamel(result.rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await query(
      `SELECT * FROM ${TABLES.USER} WHERE email = $1`,
      [email]
    )

    if (result.rows.length === 0) return null;

    return snakeToCamel(result.rows[0]);
  }

  async findById(id: string): Promise<User | null> {
    const result = await query(`
      SELECT * FROM ${TABLES.USER}
      WHERE id = $1
      `, [id]
    )

    if (result.rows.length === 0) return null;
    return snakeToCamel(result.rows[0])
  }
}
