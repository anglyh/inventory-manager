import type { User } from './user.model.js';

export type MovementType = "IN" | "OUT" | "ADJUSTMENT";

export interface InventoryMovement {
  id: string;
  userId: User['id'];
  movementType: MovementType;
  entityName: string | null;
  notes: string | null;
  createdAt: Date;
}

export type InventoryMovementInsert = Omit<InventoryMovement, 'id' | 'createdAt'>;

export interface InventoryMovementWithItems extends InventoryMovement {
  totalAmount: number; // La suma de quantity * unitPrice
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: number; // Recuerda que en el repo haces un cast a texto, quizá tengas que poner string aquí dependiendo de tu utils/mapper
    quantity: number;
  }>;
}

/** Fila agregada en listado (repo JSON + sum). */
export interface InventoryMovementListItem {
  id: string;
  movementType: MovementType;
  entityName: string | null;
  notes: string | null;
  createdAt: Date;
  totalAmount: number | null;
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: string;
    quantity: number;
  }>;
}