import type { InventoryMovement } from './inventory-movement.model.js';
import type { Product } from './product.model.js';

export interface InventoryMovementItem {
  id: string;
  movementId: InventoryMovement['id'];
  productId: Product['id'];
  quantity: number;
  unitPrice: number;
}

export type InventoryMovementItemInsert = Omit<InventoryMovementItem, 'id' | 'movementId'>;

/** Filas devueltas al insertar ítems (sin id ni movementId). */
export type CreatedInventoryMovementItem = Pick<
  InventoryMovementItem,
  'productId' | 'quantity' | 'unitPrice'
>;