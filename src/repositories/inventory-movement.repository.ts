import type { PoolClient } from 'pg';
import type { InventoryMovement, InventoryMovementInsert, MovementType } from '../models/inventory-movement.model.js';
import { TABLES } from '../db/tables.js';
import { snakeToCamel } from '../utils/mapper.js';
import { query } from '../db/index.js';
import type {
  CreatedInventoryMovementItem,
  InventoryMovementItemInsert,
} from '../models/inventory-movement-item.model.js';
import type { IInventoryMovementRepository, ListMovementCursorFilters } from '../interfaces/repositories/inventory-movement.repository.interface.js';
import { AppError } from '../errors/app.error.js';

interface ListMovementFilters {
  userId: string;
  page: number;
  limit: number;
  movementType?: MovementType
}


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

  async listAll(filters: ListMovementFilters) {
    const { userId, page, limit, movementType } = filters;
    const offset = (page - 1) * limit;
    
    const conditions: string[] = [];
    const values = [];

    values.push(userId)
    conditions.push(`m.user_id = $${values.length}`)
   
    if (movementType) {
      values.push(movementType)
      conditions.push(`m.movement_type = $${values.length}`)
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`
    const countText = `SELECT COUNT (*) FROM ${TABLES.INVENTORY_MOVEMENT} m ${whereClause}`
    const countResult = await query(countText, values);
    const totalItems = parseInt(countResult.rows[0].count, 10);

    const paginationValues = [...values, limit, offset];
    const limitIndex = values.length + 1;
    const offsetIndex = values.length + 2;

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
      FROM ${TABLES.INVENTORY_MOVEMENT} AS m
      LEFT JOIN ${TABLES.INVENTORY_MOVEMENT_ITEM} AS mi ON m.id = mi.movement_id
      LEFT JOIN ${TABLES.PRODUCT} AS p ON mi.product_id = p.id
      ${whereClause}
      GROUP BY m.id, m.movement_type, m.entity_name, m.notes, m.created_at
      ORDER BY m.created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const result = await query(text, paginationValues)
    return {
      data: snakeToCamel(result.rows),
      totalItems
    }
  }

  async list(filters: ListMovementCursorFilters) {
    const { userId, movementType, cursorDate, cursorId, limit } = filters
    const conditions: string[] = []
    const values = []

    values.push(userId)
    conditions.push(`m.user_id = $${values.length}`)

    if (!movementType) {
      throw new AppError('Falta indicar el tipo de movimiento', 500)
    }

    values.push(movementType)
    conditions.push(`m.movement_type = $${values.length}`)

    if (cursorDate && cursorId) {
      values.push(cursorDate)
      const dateIndex = values.length

      values.push(cursorId)
      const idIndex = values.length

      conditions.push(`(m.created_at < $${dateIndex} OR (m.created_at = $${dateIndex} AND m.id < $${idIndex}))`);
    } else if (cursorDate) {
      values.push(cursorDate)
      conditions.push(`m.created_at < $${values.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    values.push(limit)
    const limitIndex = values.length;

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
        LIMIT $${limitIndex}
    `

    const result = await query(text, values)
    return snakeToCamel(result.rows)
  }

  async createMovementItems(
    movementId: string,
    movementItems: InventoryMovementItemInsert[],
    client: PoolClient
  ): Promise<CreatedInventoryMovementItem[]> {
    const values: any[] = [];
    const valuePlaceholders: string[] = [];
    const TOTAL_COLUMNS = 4;

    movementItems.forEach((item, index) => {
      const baseIndex = index * TOTAL_COLUMNS;

      valuePlaceholders.push(
        `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`
      );
      values.push(movementId, item.productId, item.quantity, item.unitPrice);
    })

    const text=  `
      INSERT INTO ${TABLES.INVENTORY_MOVEMENT_ITEM} (movement_id, product_id, quantity, unit_price)
      VALUES ${valuePlaceholders.join(", ")}
      RETURNING product_id, quantity, unit_price
    `

    const result = await client.query(text, values)
    return snakeToCamel(result.rows)
  }
}