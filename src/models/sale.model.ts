import type { SaleItem } from './sale-item.model.js';
import type { User } from './user.model.js';

export const PAYMENT_METHODS = [
  'EFECTIVO',
  'YAPE',
  'PLIN',
  'TRANSFERENCIA'
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number];

export interface Sale {
  id: string;
  userId: User["id"];
  createdAt: Date;
  paymentMethod: PaymentMethod,
}

export interface SaleDetailResponse {
  id: string;
  createdAt: Date;
  totalAmount: string;
  items: SaleItem[]
}

export interface SaleTotals {
  totalAmount: number; // (precio * cantidad)
  totalUnitCost: number; // Costo total de los productos vendidos
}