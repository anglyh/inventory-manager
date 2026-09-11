import type { InventoryMovement } from './inventory-movement.model.js';
import type { Product } from './product.model.js';

export interface InventoryMovementItem {
  id: string;
  movementId: InventoryMovement['id'];
  productId: Product['id'];
  /** Precio unitario de la operación. En OUT = precio de venta, en IN = costo de compra. */
  unitPrice: string;
  /** Snapshot del costo unitario congelado al momento del movimiento.
   * - IN  -> coincide con unitPrice (lo que se pagó).
   * - OUT -> product.unitCostAvg vigente en ese instante.
   * Sirve para calcular ganancias históricas de forma estable.
   */
  unitCost: string;
  quantity: number;
}
