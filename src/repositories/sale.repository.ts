import type { PoolClient } from 'pg';
import { query } from '../db/index.js';
import { TABLES } from '../db/tables.js';
import type { SaleItem, SaleItemInsert } from '../models/sale-item.model.js';
import type { PaymentMethod, Sale, SaleDetailResponse } from '../models/sale.model.js';
import { snakeToCamel } from '../utils/mapper.js';
import type { ISaleRepository } from '../interfaces/repositories/sale.repository.interface.js';

export default class SaleRepository implements ISaleRepository {
  async createSale(userId: string, method: PaymentMethod, client: PoolClient): Promise<Sale> {
    const result = await client.query(`
      INSERT INTO ${TABLES.SALE} (user_id, payment_method)
      VALUES ($1, $2)
      RETURNING *
      `, [userId, method]
    );
    return snakeToCamel(result.rows[0]);
  }

  async listAllSales(userId: string): Promise<SaleDetailResponse[]> {
    const result = await query(`
      SELECT
        s.id,
        s.created_at,
        SUM(si.sale_price * si.quantity) AS total_amount,
        COALESCE(
          json_agg(
            json_build_object(
              'productId', si.product_id,
              'productName', prod.name,
              'salePrice', si.sale_price::text,
              'unitCost', si.unit_cost::text,
              'quantity', si.quantity
            )
          ) FILTER (WHERE si.id IS NOT NULL),
           '[]'::json
        ) AS items
      FROM ${TABLES.SALE} AS s
      LEFT JOIN ${TABLES.SALE_ITEM} AS si ON s.id = si.sale_id
      LEFT JOIN ${TABLES.PRODUCT} AS prod ON si.product_id = prod.id
      WHERE s.user_id = $1
      GROUP BY s.id, s.created_at
      ORDER BY s.created_at DESC
      `, [userId]
    );

    return snakeToCamel(result.rows)
  }

  async createSaleItems(
    saleId: string,
    saleItems: SaleItemInsert[],
    client: PoolClient
  ): Promise<SaleItem[]> {
    const values: any[] = [];
    const valuePlaceholders: string[] = [];
    const TOTAL_COLUMNS = 5

    saleItems.forEach((item, index) => {
      const baseIndex = index * TOTAL_COLUMNS;
      valuePlaceholders.push(`
        ($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5})
      `);

      values.push(
        saleId,
        item.productId,
        item.quantity,
        item.salePrice,
        item.unitCost
      );
    });

    const queryText = `
      INSERT INTO ${TABLES.SALE_ITEM} (sale_id, product_id, quantity, sale_price, unit_cost)
      VALUES ${valuePlaceholders.join(", ")}
      RETURNING product_id, quantity, sale_price, unit_cost
    `;

    const result = await client.query(queryText, values)
    return snakeToCamel(result.rows)
  }
}