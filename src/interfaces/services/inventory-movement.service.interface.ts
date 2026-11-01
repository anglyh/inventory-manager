import type { MovementType, MovementReason, MovementStatus } from '../../models/inventory-movement.model.js';
import type { SaleDTO, PurchaseDTO, LossDTO, InitialLoadDTO, StockCountDTO } from '../../schemas/inventory-movement.schema.js';
import type { InventoryMovementsByCursorParams, InventoryMovementListItem, CreatedInventoryMovementItem } from '../repositories/inventory-movement.repository.interface.js';

import type { CursorPage } from '../../types/api.types.js';

export type InventoryMovementsCursorPageResult = CursorPage<InventoryMovementListItem>;

export interface RegisterInventoryMovementResult {
  id: string;
  movementType: MovementType;
  reason: MovementReason;
  status: MovementStatus;
  notes: string | null;
  totalAmount: string;
  items: CreatedInventoryMovementItem[];
}

export interface IInventoryMovementService {
  getById(storeId: string, id: string): Promise<InventoryMovementListItem>;
  registerStockCount(storeId: string, userId: string, body: StockCountDTO): Promise<void>;
  voidMovement(storeId: string, userId: string, id: string, body: { reason: string }): Promise<void>;
  registerSale(storeId: string, data: SaleDTO, userId?: string): Promise<RegisterInventoryMovementResult>;
  registerPurchase(storeId: string, data: PurchaseDTO, userId?: string): Promise<RegisterInventoryMovementResult>;
  registerLoss(storeId: string, data: LossDTO, userId?: string): Promise<RegisterInventoryMovementResult>;

  registerInitialLoad(storeId: string, data: InitialLoadDTO, userId?: string): Promise<RegisterInventoryMovementResult>;

  listMovementsByCursor(
    filters: InventoryMovementsByCursorParams
  ): Promise<InventoryMovementsCursorPageResult>;
}
