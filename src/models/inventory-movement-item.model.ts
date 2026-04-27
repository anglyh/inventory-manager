import type { InventoryMovement } from './inventory-movement.model.js';
import type { Product } from './product.model.js';

export interface InventoryMovementItem {
  id: string;
  movementId: InventoryMovement['id'];
  productId: Product['id'];
  /** Precio unitario de la operación. En OUT = precio de venta, en IN = costo de compra. */
  unitPrice: number;
  /** Snapshot del costo unitario congelado al momento del movimiento.
   * - IN  -> coincide con unitPrice (lo que se pagó).
   * - OUT -> product.unitCostAvg vigente en ese instante.
   * Sirve para calcular ganancias históricas de forma estable.
   */
  unitCost: number;
  quantity: number;
}

/** Lo que persiste el repositorio (ya incluye unitCost calculado por el service). */
export type InventoryMovementItemInsert = Omit<
  InventoryMovementItem,
  'id' | 'movementId'
>;

/** Filas devueltas al insertar ítems (sin id ni movementId). */
export type CreatedInventoryMovementItem = Pick<
  InventoryMovementItem,
  'productId' | 'quantity' | 'unitPrice' | 'unitCost'
>;