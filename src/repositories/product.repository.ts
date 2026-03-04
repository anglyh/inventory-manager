import type { PoolClient } from 'pg';
import { query } from '../db/index.js';
import { TABLES, VIEWS } from '../db/tables.js';
import type { Product, ProductWithStock } from '../models/product.model.js';
import { snakeToCamel } from '../utils/mapper.js';
import { NotFoundError } from '../errors/app.error.js';
import type { IProductRepository } from '../interfaces/repositories/product.repository.interface.js';

export default class ProductRepository implements IProductRepository {
  async findById(productId: string, client?: PoolClient): Promise<ProductWithStock> {
    const text = `SELECT * FROM ${VIEWS.PRODUCT_WITH_STOCK} WHERE id = $1`
    const params = [productId]
    const { rows } = client
      ? await client.query(text, params)
      : await query(text, params);

    if (rows.length === 0) {
      throw new NotFoundError("No existe el producto")
    }
    return snakeToCamel(rows[0])
  }

  async listAll(userId: string, page: number, limit: number):
    Promise<{ products: ProductWithStock[], totalItems: number }> {
    const offset = (page - 1) * limit;

    const countText = `SELECT COUNT(*) FROM
      ${VIEWS.PRODUCT_WITH_STOCK} WHERE user_id = $1 AND is_active = true
    `;

    const countResult = await query(countText, [userId]);
    const totalItems = parseInt(countResult.rows[0].count, 10)

    const text = `
    SELECT 
      p.id,
      p.name,
      p.barcode,
      p.sale_price,
      p.unit_cost_avg,
      p.stock,
      p.min_stock,
      p.is_active,
      p.category_id,
      p.created_at,
      c.name AS category_name
    FROM ${VIEWS.PRODUCT_WITH_STOCK} AS p
    LEFT JOIN ${TABLES.CATEGORY} AS c ON p.category_id = c.id
    WHERE p.user_id = $1
    AND p.is_active = true
    ORDER BY p.name
    LIMIT $2 OFFSET $3
  `;

    const result = await query(text, [userId, limit, offset]);
    return {
      products: snakeToCamel(result.rows),
      totalItems
    }
  }

  async create(userId: string, productData: Product): Promise<Product> {
    const { name, salePrice, minStock, barcode, categoryId } = productData;
    const result = await query(`
      INSERT INTO ${TABLES.PRODUCT} (user_id, name, sale_price, barcode, min_stock, category_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `, [userId, name, salePrice, barcode ?? null, minStock, categoryId ?? null]
    );

    return snakeToCamel(result.rows[0])
  }

  async update(productData: Product, client?: PoolClient): Promise<Product> {
    const { id, name, salePrice, barcode, minStock, categoryId } = productData;
    const params = [name, salePrice, barcode, minStock, categoryId, id]
    const text = `
      UPDATE ${TABLES.PRODUCT}
        SET name = $1,
        sale_price = $2,
        barcode = $3,
        min_stock = $4,
        category_id = $5
      WHERE id = $6
      RETURNING *
    `;

    const { rows } = client
      ? await client.query(text, params)
      : await query(text, params)

    return snakeToCamel(rows[0])
  }

  async deactivate(id: string) {
    const result = await query(`UPDATE ${TABLES.PRODUCT} SET is_active = false  WHERE id = $1 RETURNING *`, [id])
    return snakeToCamel(result.rows[0]);
  }

  async getStock(productId: string, client?: PoolClient): Promise<number> {
    const text = `SELECT get_product_stock($1) AS stock`
    const params = [productId]

    const { rows } = client
      ? await client.query(text, params)
      : await query(text, params)

    return rows[0].stock ?? 0;
  }

  async findByIdForUpdate(productId: string, client: PoolClient): Promise<Product> {
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

  async updateUnitCostAvg(productId: string, newAvg: number, client: PoolClient): Promise<void> {
    await client.query(`
      UPDATE ${TABLES.PRODUCT}
      SET unit_cost_avg = $1
      WHERE id = $2
      `, [newAvg, productId]
    )
  }

  // static async getByBarcode(barcode: string)
}