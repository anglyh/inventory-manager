import type { Supplier } from './supplier.model.js';

export type MovementType = "IN" | "OUT";
export type MovementReason = "PURCHASE" | "SALE" | "LOSS_EXPIRED" | "LOSS_DAMAGED" | "COUNT_SURPLUS" | "COUNT_SHORTAGE" | "INITIAL_LOAD";
export type PaymentMethod = "CASH" | "YAPE";
export type MovementStatus = "COMPLETED" | "VOIDED";

export const movementDirections: Record<MovementReason, readonly MovementType[]> = {
  PURCHASE: ['IN'], SALE: ['OUT'],
  LOSS_EXPIRED: ['OUT'], LOSS_DAMAGED: ['OUT'],
  COUNT_SURPLUS: ['IN'], COUNT_SHORTAGE: ['OUT'], INITIAL_LOAD: ['IN'],
};

export const movementGroupReasons = {
  sales: ['SALE'],
  purchase: ['PURCHASE'],
  loss: ['LOSS_EXPIRED', 'LOSS_DAMAGED', 'COUNT_SHORTAGE'],
} as const satisfies Record<string, readonly MovementReason[]>;
export type MovementGroup = keyof typeof movementGroupReasons | 'voids';

export interface InventoryMovement {
  id: string;
  storeId: string;
  cashRegisterId: string | null;
  movementType: MovementType;
  reason: MovementReason;
  paymentMethod: PaymentMethod | null;
  supplierId: Supplier['id'] | null;
  createdBy: string | null;
  voidedBy: string | null;
  status: MovementStatus;
  voidedAt: Date | null;
  voidReason: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface InventoryMovementWithItems extends InventoryMovement {
  totalAmount: string;
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: string;
    quantity: number;
  }>;
}
