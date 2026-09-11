import type { PoolClient } from 'pg';
import { query } from '../db/index.js';
import type { Category } from '../models/category.model.js';
import { snakeToCamel } from '../utils/mapper.js';
import type { ICategoryRepository } from '../interfaces/repositories/category.repository.interface.js';
import { withTransaction } from '../db/transactions.js';

export default class CategoryRepository implements ICategoryRepository {
  async create(storeId: string, categoryData: Category): Promise<Category> {
    const { name } = categoryData
    const result = await query(
      `INSERT INTO category (store_id, name)
       VALUES ($1, $2)
       RETURNING *
      `, [storeId, name]
    );
    return snakeToCamel(result.rows[0])
  }

  async listAll(storeId: string): Promise<Category[]> {
    const result = await query(
      ` SELECT * FROM category
        WHERE store_id = $1
      `, [storeId]
    )
    return snakeToCamel(result.rows)
  }

  async findById(storeId: string, categoryId: string): Promise<Category | null> {
    const result = await query(
      `SELECT * FROM category WHERE store_id = $1 AND id = $2`,
      [storeId, categoryId]
    );
    if (result.rows.length === 0) return null;
    return snakeToCamel(result.rows[0]);
  }

  async update(
    storeId: string,
    categoryId: string,
    categoryData: Pick<Category, 'name'>
  ): Promise<Category> {
    const { name } = categoryData;
    const result = await query(
      `UPDATE category
        SET name = $1
        WHERE store_id = $2 AND id = $3
        RETURNING *
      `,
      [name, storeId, categoryId]
    );
    return snakeToCamel(result.rows[0]);
  }

  async delete(storeId: string, categoryId: string): Promise<void> {
    await withTransaction(async (client: PoolClient) => {
      // Primero desasociamos los productos para permitir el borrado sin conflictos FK.
      await client.query(
        `UPDATE product
          SET category_id = NULL
          WHERE store_id = $1 AND category_id = $2
        `,
        [storeId, categoryId]
      );

      await client.query(
        `DELETE FROM category WHERE store_id = $1 AND id = $2`,
        [storeId, categoryId]
      );
    });
  }
}