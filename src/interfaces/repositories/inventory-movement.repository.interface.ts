import type { PoolClient } from 'pg';
import type { Product } from '../../models/product.model.js';
import type { InventoryMovementItem } from '../../models/inventory-movement-item.model.js';

export type InventoryMovementItemInsert = {
  productId: Product['id'];
  unitPrice: number;
  unitCost: number;
  unitCostBefore?: number | undefined;
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

export type InventoryMovementInsert = Omit<InventoryMovement, 'id' | 'createdAt' | 'status' | 'voidedAt' | 'voidReason' | 'voidedBy'>;

export interface InventoryMovementsByCursorParams {
  storeId: string;
  cashRegisterId?: string | undefined;
  id?: string | undefined;
  reason?: InventoryMovement['reason'] | undefined;
  productId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  movementType?: MovementType | undefined;
  group?: MovementGroup | undefined;
  cursorDate?: string | undefined;
  cursorId?: string | undefined;
  limit: number;
}

export interface InventoryMovementListItem extends Omit<InventoryMovement, 'createdAt'> {
  id: string;
  movementType: MovementType;
  notes: string | null;
  createdAt: string;
  totalAmount: string;
  createdByName: string | null;
  supplierName: string | null;
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: string;
    unitCost: string;
    quantity: number;
  }>;
}

export interface IInventoryMovementRepository {
  hasProductMovements(productId: string, client: PoolClient): Promise<boolean>;
  getForVoid(storeId: string, id: string, client: PoolClient, lock?: boolean): Promise<InventoryMovement | null>;
  getVoidItems(id: string, client: PoolClient): Promise<Array<{ productId: string; quantity: number; unitCostBefore: string | null }>>;
  hasLaterMovement(id: string, productId: string, client: PoolClient): Promise<boolean>;
  canReverseCashSale(id: string, client: PoolClient): Promise<boolean>;
  void(storeId: string, id: string, userId: string, reason: string, client: PoolClient): Promise<void>;
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
