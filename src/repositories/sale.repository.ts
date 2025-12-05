import type { PoolClient } from 'pg';
import { query } from '../db/index.js';
import { TABLES } from '../db/tables.js';
import type { SaleItem, SaleItemInsert } from '../models/sale-item.model.js';
import type { Sale } from '../models/sale.model.js';
import { snakeToCamel } from '../utils/mapper.js';

export default class SaleRepository {
  static async createSale(userId: string, saleData: Pick<Sale, "totalAmount" | "totalProfit">, client: PoolClient): Promise<Sale> {
    const { totalAmount, totalProfit } = saleData;
    const result = await client.query(`
      INSERT INTO ${TABLES.SALE} (user_id, total_amount, total_profit)
      VALUES ($1, $2, $3)
      RETURNING *
      `, [userId, totalAmount, totalProfit],
    );
    return snakeToCamel(result.rows[0]);
  }

  static async listAllSales(userId: string) {
    const result = await query(`
      SELECT 
        s.id,
        total_amount,
        total_profit,
        s.created_at,
        si.id,
        product_name, 
        quantity,
        si.sale_price,
        si.unit_cost
      FROM ${TABLES.SALE} AS s
      LEFT JOIN ${TABLES.SALE_ITEM} AS si ON s.id = si.sale_id
      WHERE s.id = $1
      `, [userId]
    );
    return snakeToCamel(result.rows)
  }

  static async createSaleItem(saleItem: SaleItem, client: PoolClient): Promise<SaleItem> {
    const { productId, productName, quantity, saleId, salePrice, unitCost } = saleItem
    const result = await client.query(`
        INSERT INTO ${TABLES.SALE_ITEM} (product_id, product_name, quantity, sale_id, sale_price, unit_cost)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [productId, productName, quantity, saleId, salePrice, unitCost]
    )
    return snakeToCamel(result.rows[0])
  }

  static async createSaleItems(
    saleId: string,
    saleItems: SaleItemInsert[],
    client: PoolClient
  ): Promise<SaleItem[]> {
    const values: any[] = [];
    const valuePlaceholders: string[] = [];

    saleItems.forEach((item, index) => {
      const baseIndex = index * 6
      valuePlaceholders.push(`
        ($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})
      `);

      values.push(
        saleId,
        item.productId,
        item.productName,
        item.quantity,
        item.salePrice,
        item.unitCost
      );
    });

    const queryText = `
      INSERT INTO ${TABLES.SALE_ITEM} (sale_id, product_id, product_name, quantity, sale_price, unit_cost)
      VALUES ${valuePlaceholders.join(", ")}
      RETURNING product_id, product_name, quantity, sale_price, unit_cost
    `;

    const result = await client.query(queryText, values)
    return snakeToCamel(result.rows[0])
  }
}