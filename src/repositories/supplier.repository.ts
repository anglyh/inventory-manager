import type { PoolClient } from 'pg';
import { query } from '../db/index.js';
import { snakeToCamel } from '../utils/mapper.js';
import type { Supplier } from '../models/supplier.model.js';
import type { ISupplierRepository } from '../interfaces/repositories/supplier.repository.interface.js';

export default class SupplierRepository implements ISupplierRepository {
  async list(storeId: string): Promise<Supplier[]> {
    const result = await query(`
      SELECT id, store_id, name, created_at
      FROM supplier
      WHERE store_id = $1
      ORDER BY name, id
    `, [storeId]);
    return snakeToCamel(result.rows);
  }

  async findById(storeId: string, id: string, client: PoolClient): Promise<Supplier | null> {
    const result = await client.query(`
      SELECT id, store_id, name, created_at
      FROM supplier
      WHERE store_id = $1 AND id = $2
      FOR KEY SHARE
    `, [storeId, id]);
    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async create(storeId: string, name: string): Promise<Supplier> {
    const result = await query(`
      INSERT INTO supplier (store_id, name)
      VALUES ($1, $2)
      RETURNING id, store_id, name, created_at
    `, [storeId, name]);
    return snakeToCamel(result.rows[0]);
  }

  async update(storeId: string, id: string, name: string): Promise<Supplier | null> {
    const result = await query(`
      UPDATE supplier
      SET name = $3
      WHERE store_id = $1 AND id = $2
      RETURNING id, store_id, name, created_at
    `, [storeId, id, name]);
    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async delete(storeId: string, id: string): Promise<boolean> {
    const result = await query(`
      DELETE FROM supplier
      WHERE store_id = $1 AND id = $2
      RETURNING id
    `, [storeId, id]);
    return result.rows.length > 0;
  }
}
