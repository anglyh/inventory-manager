import type { PoolClient } from 'pg';
import type { PurchaseItem, PurchaseItemDetail, PurchaseItemInsert } from '../models/purchase-item.model.js';
import type { Purchase, PurchaseInsert } from '../models/purchase.model.js';
import { snakeToCamel } from '../utils/mapper.js';
import { TABLES } from '../db/tables.js';
import { query } from '../db/index.js';
import type { IPurchaseRepository } from '../interfaces/repositories/purchase.repository.interface.js';

export default class PurchaseRepository implements IPurchaseRepository {
  async create(userId: string, purchaseBasicData: PurchaseInsert, client: PoolClient): Promise<Purchase> {
    const { supplierName, notes } = purchaseBasicData;
    const result = await client.query(
      `INSERT INTO ${TABLES.PURCHASE} (user_id, supplier_name, notes)
       VALUES ($1, $2, $3)
       RETURNING *
      `, [userId, supplierName ?? null, notes ?? null]
    )

    return snakeToCamel(result.rows[0])
  }

  async listAllPurchases(userId: string) {
    const result = await query(`
      SELECT 
        p.id,
        p.supplier_name,
        p.notes,
        p.created_at,
        SUM(pi.unit_cost * pi.quantity) as total_amount,
        COALESCE(
          json_agg(
            json_build_object(
              'productId', pi.product_id,
              'productName', prod.name,
              'unitCost', pi.unit_cost::text,
              'quantity', pi.quantity
            ) 
          ) FILTER (WHERE pi.id IS NOT NULL),
            '[]'::json
        ) AS items
      FROM ${TABLES.PURCHASE} AS p
      LEFT JOIN ${TABLES.PURCHASE_ITEM} AS pi ON p.id = pi.purchase_id
      LEFT JOIN ${TABLES.PRODUCT} AS prod ON pi.product_id = prod.id
      WHERE p.user_id = $1
      GROUP BY p.id, p.supplier_name, p.notes, p.created_at
      ORDER BY p.created_at DESC
      `, [userId]
    )

    return snakeToCamel(result.rows)
  }

  async createPurchaseItems(
    purchaseId: string,
    purchaseItems: PurchaseItemInsert[],
    client: PoolClient
  ): Promise<PurchaseItem[]> {
    const values: any = [];
    const valuePlaceholders: string[] = [];
    const TOTAL_COLUMNS = 4

    purchaseItems.forEach((item, index) => {
      const baseIndex = index * TOTAL_COLUMNS

      valuePlaceholders.push(
        `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`
      );
      values.push(
        purchaseId,
        item.productId,
        item.quantity,
        item.unitCost
      )
    })
    const queryText = `
      INSERT INTO ${TABLES.PURCHASE_ITEM} (purchase_id, product_id, quantity, unit_cost)
      VALUES ${valuePlaceholders.join(", ")}
      RETURNING product_id, quantity, unit_cost
    `
    const result = await client.query(queryText, values)
    return snakeToCamel(result.rows)
  }
}