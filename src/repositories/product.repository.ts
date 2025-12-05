import type { Pool, PoolClient } from 'pg';
import { query } from '../db/index.js';
import { TABLES } from '../db/tables.js';
import type { Product } from '../models/product.model.js';
import { snakeToCamel } from '../utils/mapper.js';
import { BadRequest, NotFoundError } from '../errors/app.error.js';

export default class ProductRepository {
  static async findById(productId: string, client?: PoolClient): Promise<Product> {
    const text = `SELECT * FROM ${TABLES.PRODUCT} WHERE id = $1`
    const params = [productId]
    const { rows } = client
      ? await client.query(text, params)
      : await query(text, params);

    if (rows.length === 0) {
      throw new NotFoundError("No existe el producto")
    }
    
    return snakeToCamel(rows[0])
  }

  static async listAll(userId: string): Promise<Product[]> {
    const result = await query(`
      SELECT p.id, p.name, stock, sale_price, unit_cost, c.name AS category_name
      FROM ${TABLES.PRODUCT} AS p
      LEFT JOIN ${TABLES.CATEGORY} AS c ON p.category_id = c.id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
      `, [userId]
    );
    return snakeToCamel(result.rows);
  }

  static async create(userId: string, productData: Product): Promise<Product> {
    const { name, stock, salePrice, unitCost, categoryId } = productData;
    const result = await query(`
      INSERT INTO ${TABLES.PRODUCT} (user_id, name, stock, sale_price, unit_cost, category_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `, [userId, name, stock, salePrice, unitCost, categoryId ?? null]
    );

    return snakeToCamel(result.rows[0])
  }

  static async update(productData: Product, client?: PoolClient): Promise<Product> {
    const { id, name, stock, salePrice, unitCost, categoryId } = productData;
    const params = [name, stock, salePrice, unitCost, categoryId, id]
    const text = `
      UPDATE ${TABLES.PRODUCT}
        SET name = $1,
        stock = $2,
        sale_price = $3,
        unit_cost = $4,
        category_id = $5
      WHERE id = $6
      RETURNING *
    `;

    const { rows } = client
      ? await client.query(text, params)
      : await query(text, params)

    return snakeToCamel(rows[0])
  }

  static async delete(id: string) {
    const result = await query(`DELETE FROM ${TABLES.PRODUCT} WHERE id = $1 RETURNING *`, [id]);
    return snakeToCamel(result.rows[0]);
  }
}