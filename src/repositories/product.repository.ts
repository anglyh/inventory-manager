import type { PoolClient } from 'pg';
import { query } from '../db/index.js';
import { TABLES, VIEWS } from '../db/tables.js';
import type { Product, ProductWithStock } from '../models/product.model.js';
import { snakeToCamel } from '../utils/mapper.js';
import { NotFoundError } from '../errors/app.error.js';

export default class ProductRepository {
  static async findById(productId: string, client?: PoolClient): Promise<ProductWithStock> {
    const text = `SELECT * FROM ${VIEWS.PRODUCT_DETAILS} WHERE id = $1`
    const params = [productId]
    const { rows } = client
      ? await client.query(text, params)
      : await query(text, params);

    if (rows.length === 0) {
      throw new NotFoundError("No existe el producto")
    }
    return snakeToCamel(rows[0])
  }

  static async listAll(userId: string): Promise<ProductWithStock[]> {
    const result = await query(`
      SELECT 
        p.id,
        p.name,
        p.sale_price,
        p.unit_cost_avg,
        p.stock,
        p.min_stock,
        p.category_id AS category_id,
        p.created_at,
        c.name AS category_name
      FROM ${VIEWS.PRODUCT_DETAILS} AS p
      LEFT JOIN ${TABLES.CATEGORY} AS c ON p.category_id = c.id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
      `, [userId]
  );
    return snakeToCamel(result.rows);
  }

  static async create(userId: string, productData: Product): Promise<Product> {
    const { name, salePrice, minStock, categoryId } = productData;
    const result = await query(`
      INSERT INTO ${TABLES.PRODUCT} (user_id, name, sale_price, min_stock, category_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `, [userId, name, salePrice, minStock, categoryId ?? null]
    );

    return snakeToCamel(result.rows[0])
  }

  static async update(productData: Product, client?: PoolClient): Promise<Product> {
    const { id, name, salePrice, categoryId } = productData;
    const params = [name, salePrice, categoryId, id]
    const text = `
      UPDATE ${TABLES.PRODUCT}
        SET name = $1,
        sale_price = $2,
        category_id = $3
      WHERE id = $5
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

  static async getStock(productId: string, client?: PoolClient): Promise<number> {
    const text = `SELECT get_product_stock($1) AS stock`
    const params = [productId]

    const { rows } = client
      ? await client.query(text, params)
      : await query(text, params)

    return rows[0].stock ?? 0;
  }

  static async findByIdForUpdate(productId: string, client: PoolClient): Promise<Product> {
    const result = await client.query(`
      SELECT * FROM ${TABLES.PRODUCT}
      WHERE id = $1 
      FOR UPDATE
      `, [productId]
    )

    if (result.rows.length === 0) {
      throw new NotFoundError("No existe el producto")
    }

    return snakeToCamel(result.rows[0])
  }

  static async updateUnitCostAvg(productId: string, newAvg: number, client: PoolClient) {
    await client.query(`
      UPDATE ${TABLES.PRODUCT}
      SET unit_cost_avg = $1
      WHERE id = $2
      `, [newAvg, productId]
    )
  }
}