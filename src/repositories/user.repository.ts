import { query } from '../db/index.js';
import { TABLES } from '../db/tables.js';
import type { User } from '../models/user.model.js';
import { snakeToCamel } from '../utils/mapper.js';
import type { IUserRepository } from '../interfaces/repositories/user.repository.interface.js';

export default class UserRepository implements IUserRepository {
  async create(storeName: string, name: string, email: string, password: string): Promise<User> {
    const result = await query(
      `WITH new_store AS (
        INSERT INTO ${TABLES.STORE} (name)
        VALUES ($1)
        RETURNING id
      )
      INSERT INTO ${TABLES.USER} (store_id, name, email, password, role)
      VALUES ((SELECT id FROM new_store), $2, $3, $4, 'ADMIN')
      RETURNING *;
      `, [storeName, name, email, password]
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