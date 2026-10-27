import type { PoolClient } from 'pg';
import { query } from '../db/index.js';
import { TABLES, VIEWS } from '../db/tables.js';
import type { Product, ProductWithStock, ProductListItem, ProductSearchItem, ProductOption } from '../models/product.model.js';
import type { CreateProductDTO, UpdateProductDTO } from '../schemas/product.schema.js';
import { snakeToCamel } from '../utils/mapper.js';
import { NotFoundError } from '../errors/app.error.js';
import type { IProductRepository, ListProductQuery, ProductCountQuery } from '../interfaces/repositories/product.repository.interface.js';

export default class ProductRepository implements IProductRepository {
  async findById(productId: string, client?: PoolClient): Promise<ProductWithStock | null> {
    const text = `SELECT *, COALESCE(unit_cost_avg, 0) AS unit_cost_avg FROM ${VIEWS.PRODUCT_WITH_STOCK} WHERE id = $1`
    const params = [productId]
    const { rows } = client
      ? await client.query(text, params)
      : await query(text, params);
    
    return rows[0] ? snakeToCamel(rows[0]) : null;
  }

  async findForStore(storeId: string, productId: string, client?: PoolClient): Promise<ProductWithStock | null> {
    const sql = `SELECT * FROM ${VIEWS.PRODUCT_WITH_STOCK} WHERE store_id = $1 AND id = $2`;
    const result = client
      ? await client.query(sql, [storeId, productId])
      : await query(sql, [storeId, productId]);
    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async findByBarcode(storeId: string, barcode: string): Promise<Pick<Product, 'id' | 'name'> | null> {
    // Includes deactivated products: the barcode stays unique per store for them too.
    const { rows } = await query(
      `SELECT id, name FROM ${TABLES.PRODUCT} WHERE store_id = $1 AND barcode = $2 LIMIT 1`,
      [storeId, barcode],
    );
    return rows[0] ? snakeToCamel(rows[0]) : null;
  }

  async categoryBelongsToStore(storeId: string, categoryId: string, client: PoolClient): Promise<boolean> {
    const result = await client.query(`
      SELECT id FROM category
      WHERE store_id = $1 AND id = $2
      FOR KEY SHARE
    `, [storeId, categoryId]);
    return result.rows.length > 0;
  }

  async listAll(filters: ListProductQuery): Promise<ProductListItem[]> {
    const { limit, offset, ...rest } = filters
    const { conditions, params } = this.buildWhereClause(rest)

    const whereClause = conditions.length 
      ? `WHERE ${conditions.join(' AND ')} AND p.is_active = true`
      : '';
    
    const text = `
      SELECT 
        p.id,
        p.name,
        p.barcode,
        p.sale_price,
        COALESCE(p.unit_cost_avg, 0) AS unit_cost_avg,
        p.stock,
        p.min_stock,
        p.is_active,
        p.category_id,
        p.created_at,
        c.name AS category_name
      FROM ${VIEWS.PRODUCT_WITH_STOCK} AS p
      LEFT JOIN ${TABLES.CATEGORY} AS c ON p.category_id = c.id
      ${whereClause}
      ORDER BY ${rest.lowStock ? 'p.stock - p.min_stock ASC, ' : ''}p.name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const result = await query(text, [...params, limit, offset]);
    return snakeToCamel(result.rows)
  }

  async create(storeId: string, productData: CreateProductDTO, client: PoolClient): Promise<Product> {
    const { name, salePrice, minStock, barcode, categoryId } = productData;
    const result = await client.query(`
      INSERT INTO ${TABLES.PRODUCT} (store_id, name, sale_price, barcode, min_stock, category_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `, [storeId, name.trim(), salePrice, barcode?.trim() || null, minStock, categoryId ?? null]
    );

    return snakeToCamel(result.rows[0])
  }

  async update(storeId: string, id: string, productData: UpdateProductDTO, client: PoolClient): Promise<Product> {
    const { name, salePrice, barcode, minStock, categoryId } = productData;
    const params = [name.trim(), salePrice, barcode?.trim() || null, minStock ?? null, categoryId ?? null, id, storeId, barcode !== undefined, categoryId !== undefined];
    const text = `
      UPDATE ${TABLES.PRODUCT}
        SET name = $1,
        sale_price = $2,
        barcode = CASE WHEN $8 THEN $3 ELSE barcode END,
        min_stock = COALESCE($4, min_stock),
        category_id = CASE WHEN $9 THEN $5::uuid ELSE category_id END
      WHERE id = $6 AND store_id = $7
      RETURNING *
    `;

    const { rows } = await client.query(text, params);
    if (!rows[0]) throw new NotFoundError('El producto no existe');
    return snakeToCamel(rows[0]);
  }

  async deactivate(storeId: string, id: string): Promise<void> {
    const result = await query(`
      UPDATE ${TABLES.PRODUCT}
      SET is_active = false
      WHERE store_id = $1 AND id = $2
      RETURNING id
    `, [storeId, id]);
    if (!result.rows[0]) throw new NotFoundError('El producto no existe');
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

  async listProductOptions(storeId: string): Promise<ProductOption[]> {
    const params = [storeId]
    const text = `
    SELECT
      p.id,
      p.name,
      p.sale_price,
      p.barcode,
      p.stock,
      p.category_id,
      c.name AS category_name,
      -- Mismo criterio que la carga inicial: incluye movimientos anulados.
      EXISTS (
        SELECT 1 FROM ${TABLES.INVENTORY_MOVEMENT_ITEM} AS mi WHERE mi.product_id = p.id
      ) AS has_movements
    FROM ${VIEWS.PRODUCT_WITH_STOCK} AS p
    LEFT JOIN ${TABLES.CATEGORY} AS c ON p.category_id = c.id
    WHERE p.store_id = $1 AND p.is_active = true
    ORDER BY p.name ASC
    `
    const result = await query(text, params)
    return snakeToCamel(result.rows)
  }

  async getByName(storeId: string, searchTerm: string): Promise<ProductSearchItem[]> {
    const params = [storeId, `%${searchTerm}%`]
    const text =`
    SELECT 
      p.id,
      p.name,
      p.sale_price
    FROM ${TABLES.PRODUCT} AS p
    WHERE p.store_id = $1 AND p.is_active = true AND unaccent(p.name) ILIKE unaccent($2)
    `

    const result = await query(text, params)
    return snakeToCamel(result.rows)
  }

  async count(filters: ProductCountQuery): Promise<number> {
    const { conditions, params } = this.buildWhereClause(filters)
    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')} AND p.is_active = true`
      : ''

    const result = await query(`
      SELECT COUNT (*)
      FROM ${VIEWS.PRODUCT_WITH_STOCK} as p
      LEFT JOIN ${TABLES.CATEGORY} AS c ON p.category_id = c.id
      ${whereClause}`,
      params
    )

    return parseInt(result.rows[0].count, 10)
  }

  private buildWhereClause(filters: ProductCountQuery) {
    const { storeId, search, categoryIds, withoutCategory, lowStock } = filters;
    const conditions: string[] = [];
    const params: unknown[] = [];

    params.push(storeId)
    conditions.push(`p.store_id = $${params.length}`)

    if (search) {
      params.push(`%${search}%`)
      conditions.push(`p.name ILIKE $${params.length}`)
    }

    // Categorías elegidas y/o productos sin categoría: basta con cumplir una.
    const categoryParts: string[] = [];
    if (categoryIds?.length) {
      params.push(categoryIds);
      categoryParts.push(`p.category_id = ANY($${params.length}::uuid[])`);
    }
    if (withoutCategory) categoryParts.push('p.category_id IS NULL');
    if (categoryParts.length) conditions.push(`(${categoryParts.join(' OR ')})`);

    // Por reponer: la misma regla que el aviso del reporte (activos, stock en o bajo el mínimo).
    if (lowStock) conditions.push('p.stock <= p.min_stock');

    return { conditions, params }
  }
}
