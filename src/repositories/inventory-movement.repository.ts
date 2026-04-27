import type { PoolClient } from 'pg';
import type {
  InventoryMovement,
  InventoryMovementInsert,
  InventoryMovementListItem,
  InventoryMovementsByCursorParams,
} from '../models/inventory-movement.model.js';
import { TABLES } from '../db/tables.js';
import { snakeToCamel } from '../utils/mapper.js';
import { query } from '../db/index.js';
import type {
  CreatedInventoryMovementItem,
  InventoryMovementItemInsert,
} from '../models/inventory-movement-item.model.js';
import type { IInventoryMovementRepository } from '../interfaces/repositories/inventory-movement.repository.interface.js';

export default class InventoryMovementRepository implements IInventoryMovementRepository {
  async create(
    data: InventoryMovementInsert,
    client: PoolClient
  ): Promise<InventoryMovement> {
    const { userId, movementType, entityName, notes } = data;
    const result = await client.query(`
      INSERT INTO ${TABLES.INVENTORY_MOVEMENT} (user_id, movement_type, entity_name, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `, [userId, movementType, entityName ?? null, notes ?? null]
    );
    return snakeToCamel(result.rows[0])
  }

  private buildMovementsCursorWhereClause(
    filters: Omit<InventoryMovementsByCursorParams, 'limit'>
  ) {
    const { userId, cursorDate, cursorId, movementType } = filters
    const conditions: string[] = []
    const params: unknown[] = []

    params.push(userId)
    conditions.push(
      `m.user_id = $${params.length}`,
    )

    if (cursorDate && cursorId) {
      params.push(cursorDate, cursorId)
      conditions.push(`
        (m.created_at < $${params.length - 1}
        OR (m.created_at = $${params.length - 1} AND m.id < $${params.length}))
      `)
    }

    params.push(movementType)
    conditions.push(`m.movement_type = $${params.length}`)

    return { conditions, params }
  }

  async listMovementsByCursor(
    filters: InventoryMovementsByCursorParams
  ): Promise<InventoryMovementListItem[]> {
    const { limit, ...rest } = filters
    const { conditions, params } = this.buildMovementsCursorWhereClause(rest)

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : ''

    const text = `
      SELECT
        m.id,
        m.movement_type,
        m.entity_name,
        m.notes,
        m.created_at,
        SUM(mi.unit_price * mi.quantity) as total_amount,
        COALESCE(
          json_agg(
            json_build_object(
              'productId', mi.product_id,
              'productName', p.name,
              'unitPrice', mi.unit_price::text,
              'quantity', mi.quantity
            )
          ) FILTER (WHERE mi.id IS NOT NULL),
          '[]'::json
        ) AS items
        FROM ${TABLES.INVENTORY_MOVEMENT} as m
        LEFT JOIN ${TABLES.INVENTORY_MOVEMENT_ITEM} AS mi ON m.id = mi.movement_id
        LEFT JOIN ${TABLES.PRODUCT} AS p ON mi.product_id = p.id
        ${whereClause}
        GROUP BY 
          m.id, 
          m.movement_type, 
          m.entity_name, 
          m.notes, 
          m.created_at
        ORDER BY
          m.created_at DESC,
          m.id DESC
        LIMIT $${params.length + 1}
    `
    const result = await query(text, [...params, limit + 1])
    return snakeToCamel(result.rows)
  }

  async createMovementItems(
    movementId: string,
    movementItems: InventoryMovementItemInsert[],
    client: PoolClient
  ): Promise<CreatedInventoryMovementItem[]> {
    const values: any[] = [];
    const valuePlaceholders: string[] = [];
    const TOTAL_COLUMNS = 5;

    movementItems.forEach((item, index) => {
      const baseIndex = index * TOTAL_COLUMNS;

      valuePlaceholders.push(
        `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5})`
      );
      values.push(
        movementId,
        item.productId,
        item.quantity,
        item.unitPrice,
        item.unitCost
      );
    })

    const text = `
      INSERT INTO ${TABLES.INVENTORY_MOVEMENT_ITEM} (movement_id, product_id, quantity, unit_price, unit_cost)
      VALUES ${valuePlaceholders.join(", ")}
      RETURNING product_id, quantity, unit_price, unit_cost
    `

    const result = await client.query(text, values)
    return snakeToCamel(result.rows)
  }
}
