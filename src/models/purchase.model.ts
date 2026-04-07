import type { PurchaseItem } from './purchase-item.model.js';
import type { User } from './user.model.js';

export interface Purchase {
  id: string;
  userId: User["id"];
  supplierName: string | undefined;
  notes: string | undefined;
  createdAt: Date;
}

export type PurchaseInsert = Omit<Purchase, "id" | "userId" | "createdAt">

export interface PurchaseDetailResponse {
  id: string;
  createdAt: Date;
  totalCost: number;
  items: PurchaseItem[];
  notes: string | undefined;
  supplierName: string | undefined;
}