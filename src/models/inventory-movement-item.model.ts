import type { InventoryMovement } from './inventory-movement.model.js';
import type { Product } from './product.model.js';

export interface InventoryMovementItem {
  id: string;
  movementId: InventoryMovement['id'];
  productId: Product['id'];
  /** Precio de venta en SALE, costo declarado en PURCHASE/INITIAL_LOAD y valor de referencia en ajustes. */
  unitPrice: string;
  /** Snapshot del costo unitario congelado al momento del movimiento.
   * - PURCHASE/INITIAL_LOAD: costo declarado.
   * - Otros motivos: costo promedio vigente del producto.
   * Sirve para calcular ganancias históricas de forma estable.
   */
  unitCost: string;
  /** Costo promedio anterior a una entrada, para revertirla si no tiene operaciones posteriores. */
  unitCostBefore: string | null;
  quantity: number;
}
