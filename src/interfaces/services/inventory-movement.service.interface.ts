import type {
  MovementType,
  InventoryMovementsByCursorParams,
  InventoryMovementsCursorPageResult,
} from '../../models/inventory-movement.model.js';
import type { CreateInventoryMovementPayloadDTO } from '../../schemas/inventory-movement.schema.js';

export interface RegisterInventoryMovementResult {
  id: string;
  movementType: MovementType;
  entityName: string | null;
  notes: string | null;
  totalAmount: number;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
}

export interface IInventoryMovementService {
  registerEntry(
    userId: string,
    data: CreateInventoryMovementPayloadDTO
  ): Promise<RegisterInventoryMovementResult>;

  registerExit(
    userId: string,
    data: CreateInventoryMovementPayloadDTO
  ): Promise<RegisterInventoryMovementResult>;

  listMovementsByCursor(
    filters: InventoryMovementsByCursorParams
  ): Promise<InventoryMovementsCursorPageResult>;
}
