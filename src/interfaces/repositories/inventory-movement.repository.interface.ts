import type { PoolClient } from 'pg';
import type { Product } from '../../models/product.model.js';
import type { InventoryMovementItem } from '../../models/inventory-movement-item.model.js';

export type InventoryMovementItemInsert = {
  productId: Product['id'];
  unitPrice: number;
  unitCost: number;
  quantity: number;
}

export type CreatedInventoryMovementItem = Pick<
  InventoryMovementItem,
  'productId' | 'quantity' | 'unitPrice' | 'unitCost'
>;
import type {
  InventoryMovement,
  MovementType,
  MovementGroup
} from '../../models/inventory-movement.model.js';

export type InventoryMovementInsert = Omit<InventoryMovement, 'id' | 'createdAt' | 'status' | 'voidedAt' | 'voidReason'>;

export interface InventoryMovementsByCursorParams {
  storeId: string;
  movementType?: MovementType | undefined;
  group?: MovementGroup | undefined;
  cursorDate?: string | undefined;
  cursorId?: string | undefined;
  limit: number;
}

export interface InventoryMovementListItem extends InventoryMovement {
  id: string;
  movementType: MovementType;
  notes: string | null;
  createdAt: Date;
  totalAmount: string;
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: string;
    quantity: number;
  }>;
}

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
