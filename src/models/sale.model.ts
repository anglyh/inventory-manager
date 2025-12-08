import type { SaleItem } from './sale-item.model.js';
import type { User } from './user.model.js';

export interface Sale {
  id: string;
  userId: User["id"];
  createdAt: Date;
}

export interface SaleDetailResponse {
  id: string;
  createdAt: Date;
  totalAmount: number;
  items: SaleItem[]
}

export interface SaleTotals {
  totalAmount: number; // (precio * cantidad)
  totalUnitCost: number; // Costo total de los productos vendidos
}