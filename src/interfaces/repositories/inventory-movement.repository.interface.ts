import type { PoolClient } from 'pg';
import type {
  CreatedInventoryMovementItem,
  InventoryMovementItemInsert,
} from '../../models/inventory-movement-item.model.js';
import type {
  InventoryMovementInsert,
  InventoryMovement,
  InventoryMovementsByCursorParams,
  InventoryMovementListItem,
} from '../../models/inventory-movement.model.js';

export interface IInventoryMovementRepository {
  create(
    data: InventoryMovementInsert,
    client: PoolClient
  ): Promise<InventoryMovement>;

  listMovementsByCursor(
    filters: InventoryMovementsByCursorParams
  ): Promise<InventoryMovementListItem[]>;

  createMovementItems(
    movementId: string,
    movementItems: InventoryMovementItemInsert[],
    client: PoolClient
  ): Promise<CreatedInventoryMovementItem[]>;
}
