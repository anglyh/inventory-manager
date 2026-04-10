import type { PoolClient } from 'pg';
import type {
  CreatedInventoryMovementItem,
  InventoryMovementItemInsert,
} from '../../models/inventory-movement-item.model.js';
import type { MovementType, InventoryMovementInsert, InventoryMovement } from '../../models/inventory-movement.model.js';

export interface ListMovementFilters {
  userId: string;
  page: number;
  limit: number;
  movementType?: MovementType;
}

export interface ListMovementCursorFilters {
  userId: string;
  movementType: MovementType;
  cursorDate: string;
  cursorId: string;
  limit: number;
}

export interface IInventoryMovementRepository {
  create(
    data: InventoryMovementInsert,
    client: PoolClient
  ): Promise<InventoryMovement>;

  listAll(
    filters: ListMovementFilters
  ): Promise<{
    data: any[];
    totalItems: number;
  }>;

  createMovementItems(
    movementId: string,
    movementItems: InventoryMovementItemInsert[],
    client: PoolClient
  ): Promise<CreatedInventoryMovementItem[]>;

  list(filters: ListMovementCursorFilters): Promise<any>
}