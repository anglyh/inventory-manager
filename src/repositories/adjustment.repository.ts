import type { PoolClient } from 'pg';
import type { Adjustment, AdjustmentDetailResponse, AdjustmentInsert } from '../models/adjustment.model.js';
import { TABLES } from '../db/tables.js';
import { snakeToCamel } from '../utils/mapper.js';
import type { AdjustmentItem, AdjustmentItemInsert } from '../models/adjustment-item.model.js';
import { query } from '../db/index.js';
import type { IAdjustmentRepository } from '../interfaces/repositories/adjustment.repository.interface.js';

export default class AdjustmentRepository implements IAdjustmentRepository {
  async createAdjustment(userId: string, adjustmentBasicData: AdjustmentInsert, client: PoolClient): Promise<Adjustment> {
    const { notes, reasonType } = adjustmentBasicData;
    const result = await client.query(`
      INSERT INTO ${TABLES.ADJUSTMENT} (user_id, ,reason_type, notes)
      VALUES ($1, $2, $3)
      RETURNING *
      `, [userId, reasonType, notes ?? null]
    );
    return snakeToCamel(result.rows[0])
  }

  async listAll(userId: string): Promise<AdjustmentDetailResponse[]> {
    const result = await query(`
      SELECT
        a.id,
        a.notes,
        a.reason_type,
        a.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'productId', ai.product_id,
              'adjustmentId', ai.adjustment_id,
              'productName', ai.product_name,
              'quantity', ai.quantity
            )
          ) FILTER (WHERE ai.id IS NOT NULL),
           '[]'::json
        ) AS items
      FROM ${TABLES.ADJUSTMENT} AS a
      LEFT JOIN ${TABLES.ADJUSTMENT_ITEM} AS ai ON a.id = ai.adjustment_id
      WHERE a.user_id = $1
      GROUP BY a.id, a.notes, a.reason_type, a.created_at
      `, [userId]
    )
    return snakeToCamel(result.rows)
  }

  async createAjustmentItems(
    userId: string,
    adjustmentItems: AdjustmentItemInsert[],
    client: PoolClient
  ): Promise<AdjustmentItem[]> {
    const values: any = [];
    const valuePlaceholders: string[] = [];
    const TOTAL_COLUMNS = 1;

    adjustmentItems.forEach((item, index) => {
      const baseIndex = index * TOTAL_COLUMNS;
      valuePlaceholders.push(
        `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`
      )

      values.push(
        userId,
        item.productId,
        item.productName,
        item.quantity
      )
    });

    const queryText = `
      INSERT INTO ${TABLES.ADJUSTMENT_ITEM} (user_id, product_id, product_name, quantity)
      VALUES ${valuePlaceholders.join(", ")}
      RETURNING *
    `
    const result = await client.query(queryText, values);
    return snakeToCamel(result.rows);
  }
}