import type { SaleItem } from './sale-item.model.js';
import type { User } from './user.model.js';

export interface Sale {
  id: string;
  userId: User["id"];
  totalAmount: number;
  totalProfit: number;
  createdAt: Date;
}

export interface SaleDetailResponse {
  id: string;
  userId: User["id"];
  createdAt: Date;
  totalAmount: number;
  totalProfit: number;
  items: SaleItem[]
}

export interface SaleTotals {
  totalAmount: number; // (precio * cantidad)
  totalProfit: number; // (ganancia)
  totalUnitCost: number; // Costo total de los productos vendidos
}