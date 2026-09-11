import type { MovementType, MovementReason, MovementStatus } from '../../models/inventory-movement.model.js';
import type { SaleDTO, PurchaseDTO, LossDTO, InitialLoadDTO, AdjustmentDTO } from '../../schemas/inventory-movement.schema.js';
import type { InventoryMovementsByCursorParams, InventoryMovementListItem, CreatedInventoryMovementItem } from '../repositories/inventory-movement.repository.interface.js';

export interface InventoryMovementsCursorPageResult {
  data: InventoryMovementListItem[];
  nextCursor: { cursorDate: string; cursorId: string } | null;
}

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
  registerSale(storeId: string, data: SaleDTO): Promise<RegisterInventoryMovementResult>;
  registerPurchase(storeId: string, data: PurchaseDTO): Promise<RegisterInventoryMovementResult>;
  registerLoss(storeId: string, data: LossDTO): Promise<RegisterInventoryMovementResult>;

  registerInitialLoad(storeId: string, data: InitialLoadDTO): Promise<RegisterInventoryMovementResult>;
  registerAdjustment(storeId: string, data: AdjustmentDTO): Promise<RegisterInventoryMovementResult>;

  listMovementsByCursor(
    filters: InventoryMovementsByCursorParams
  ): Promise<InventoryMovementsCursorPageResult>;
}
