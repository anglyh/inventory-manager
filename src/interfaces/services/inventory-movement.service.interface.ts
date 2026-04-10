import type {
  InventoryMovementListItem,
  MovementType,
} from '../../models/inventory-movement.model.js';
import type { CreateInventoryMovementPayloadDTO } from '../../schemas/inventory-movement.schema.js';
import type { PaginatedResult } from '../../types/api.types.js';
import type { ListMovementFilters } from '../repositories/inventory-movement.repository.interface.js';

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

  listAll(
    filters: ListMovementFilters
  ): Promise<PaginatedResult<InventoryMovementListItem>>;
}
