import type { PoolClient } from 'pg';
import { movementGroupReasons } from '../models/inventory-movement.model.js';
import type {
  InventoryMovement,
} from '../models/inventory-movement.model.js';
import { TABLES } from '../db/tables.js';
import { snakeToCamel } from '../utils/mapper.js';
import { query } from '../db/index.js';
import type {
  CreatedInventoryMovementItem,
  IInventoryMovementRepository,
  InventoryMovementItemInsert,
  InventoryMovementInsert,
  InventoryMovementListItem,
  InventoryMovementsByCursorParams,
} from '../interfaces/repositories/inventory-movement.repository.interface.js';

export default class InventoryMovementRepository implements IInventoryMovementRepository {
  async create(
    data: InventoryMovementInsert,
    client: PoolClient
  ): Promise<InventoryMovement> {
    const { storeId, cashRegisterId, movementType, reason, paymentMethod, supplierId, notes, createdBy } = data;
    const result = await client.query(`
      INSERT INTO ${TABLES.INVENTORY_MOVEMENT} 
      (store_id, cash_register_id, movement_type, reason, payment_method, supplier_id, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `, [
        storeId, 
        cashRegisterId ?? null, 
        movementType, 
        reason, 
        paymentMethod ?? null, 
        supplierId ?? null, 
        notes ?? null,
        createdBy
      ]
    );
    return snakeToCamel(result.rows[0])
  }

  private buildMovementsCursorWhereClause(
    filters: Omit<InventoryMovementsByCursorParams, 'limit'>
  ) {
    const { storeId, cursorDate, cursorId, movementType, group, cashRegisterId, reason, productId, from, to, id } = filters
    const conditions: string[] = []
    const params: unknown[] = []

    params.push(storeId)
    conditions.push(
      `m.store_id = $${params.length}`,
    )

    if (cursorDate && cursorId) {
      params.push(cursorDate, cursorId)
      conditions.push(`
        (m.created_at < $${params.length - 1}
        OR (m.created_at = $${params.length - 1} AND m.id < $${params.length}))
      `)
    }

    if (cashRegisterId) {
      params.push(cashRegisterId);
      conditions.push(`m.cash_register_id = $${params.length}`);
    }
    if (id) {
      params.push(id);
      conditions.push(`m.id = $${params.length}`);
    }
    if (reason) {
      params.push(reason);
      conditions.push(`m.reason = $${params.length}::movement_reason`);
    }
    if (productId) {
      params.push(productId);
      conditions.push(`EXISTS (SELECT 1 FROM inventory_movement_item filter_item WHERE filter_item.movement_id = m.id AND filter_item.product_id = $${params.length})`);
    }
    if (from) {
      params.push(from);
      conditions.push(`m.created_at >= $${params.length}::timestamptz`);
    }
    if (to) {
      params.push(to);
      conditions.push(`m.created_at < $${params.length}::timestamptz`);
    }
    if (movementType) {
      params.push(movementType)
      conditions.push(`m.movement_type = $${params.length}`)
    }
    if (!id) {
      params.push(group === 'voids' ? 'VOIDED' : 'COMPLETED');
      conditions.push(`m.status = $${params.length}`);
    }
    if (group && group !== 'voids') {
      params.push(movementGroupReasons[group]);
      conditions.push(`m.reason = ANY($${params.length}::movement_reason[])`);
    }

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
        m.store_id,
        m.cash_register_id,
        m.movement_type,
        m.reason,
        m.payment_method,
        m.supplier_id,
        m.created_by,
        m.voided_by,
        u.name AS created_by_name,
        s.name AS supplier_name,
        m.status,
        m.voided_at,
        m.void_reason,
        m.notes,
        to_char(m.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at,
        COALESCE(SUM(mi.unit_price * mi.quantity), 0.00)::text as total_amount,
        COALESCE(
          json_agg(
            json_build_object(
              'productId', mi.product_id,
              'productName', p.name,
              'unitPrice', mi.unit_price::text,
              'unitCost', mi.unit_cost::text,
              'quantity', mi.quantity
            )
            ORDER BY mi.id
          ) FILTER (WHERE mi.id IS NOT NULL),
          '[]'::json
        ) AS items
        FROM ${TABLES.INVENTORY_MOVEMENT} as m
        LEFT JOIN ${TABLES.INVENTORY_MOVEMENT_ITEM} AS mi ON m.id = mi.movement_id
        LEFT JOIN ${TABLES.PRODUCT} AS p ON mi.product_id = p.id
        LEFT JOIN app_user AS u ON u.id = m.created_by
        LEFT JOIN supplier AS s ON s.id = m.supplier_id
        ${whereClause}
        GROUP BY 
          m.id, 
          m.movement_type, 
          m.notes, 
          m.created_at,
          u.name,
          s.name
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
    if (movementItems.length === 0) return [];
    const values: unknown[] = [];
    const valuePlaceholders: string[] = [];
    const TOTAL_COLUMNS = 6;

    movementItems.forEach((item, index) => {
      const baseIndex = index * TOTAL_COLUMNS;

      valuePlaceholders.push(
        `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`
      );
      values.push(
        movementId,
        item.productId,
        item.quantity,
        item.unitPrice,
        item.unitCost,
        item.unitCostBefore ?? null
      );
    })

    const text = `
      INSERT INTO ${TABLES.INVENTORY_MOVEMENT_ITEM} (movement_id, product_id, quantity, unit_price, unit_cost, unit_cost_before)
      VALUES ${valuePlaceholders.join(", ")}
      RETURNING product_id, quantity, unit_price::text AS unit_price, unit_cost::text AS unit_cost
    `

    const result = await client.query(text, values)
    return snakeToCamel(result.rows)
  }

  async hasProductMovements(productId: string, client: PoolClient): Promise<boolean> {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM inventory_movement_item WHERE product_id = $1
      ) AS found
    `, [productId]);
    return result.rows[0].found;
  }

  async getForVoid(storeId: string, id: string, client: PoolClient, lock = false): Promise<InventoryMovement | null> {
    const result = await client.query(`
      SELECT * FROM inventory_movement WHERE store_id = $1 AND id = $2
      ${lock ? 'FOR UPDATE' : ''}
    `, [storeId, id]);
    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async getVoidItems(id: string, client: PoolClient) {
    const result = await client.query(`
      SELECT product_id, SUM(quantity)::integer AS quantity,
        MIN(unit_cost_before)::text AS unit_cost_before
      FROM inventory_movement_item
      WHERE movement_id = $1
      GROUP BY product_id
      ORDER BY product_id
    `, [id]);
    return snakeToCamel<Array<{ productId: string; quantity: number; unitCostBefore: string | null }>>(result.rows);
  }

  async hasLaterMovement(id: string, productId: string, client: PoolClient): Promise<boolean> {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM inventory_movement newer
        JOIN inventory_movement_item item ON item.movement_id = newer.id
        JOIN inventory_movement original ON original.id = $1
        WHERE item.product_id = $2
          AND newer.status = 'COMPLETED'
          AND (newer.created_at, newer.id) > (original.created_at, original.id)
      ) AS found
    `, [id, productId]);
    return result.rows[0].found;
  }

  async canReverseCashSale(id: string, client: PoolClient): Promise<boolean> {
    const result = await client.query(`
      SELECT totals.expected_cash >= (
        SELECT COALESCE(SUM(quantity * unit_price), 0)
        FROM inventory_movement_item WHERE movement_id = m.id
      ) AS allowed
      FROM inventory_movement m
      JOIN vw_cash_register_totals totals ON totals.cash_register_id = m.cash_register_id
      WHERE m.id = $1
    `, [id]);
    return result.rows[0]?.allowed === true;
  }

  async void(storeId: string, id: string, userId: string, reason: string, client: PoolClient): Promise<void> {
    await client.query(`
      UPDATE inventory_movement
      SET status = 'VOIDED', voided_at = clock_timestamp(), void_reason = $4, voided_by = $3
      WHERE store_id = $1 AND id = $2 AND status = 'COMPLETED'
    `, [storeId, id, userId, reason]);
  }
}
