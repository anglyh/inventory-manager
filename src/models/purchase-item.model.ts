import type { Product } from './product.model.js';
import type { Purchase } from './purchase.model.js';

export interface PurchaseItem {
  id: string;
  productId: Product["id"];
  purchaseId: Purchase["id"]
  quantity: number;
  unitCost: string;
}

export type PurchaseItemDetail = PurchaseItem & {
  productName: string
}

export interface PurchaseItemInsert {
  productId: string;
  quantity: number;
  productName: string;
  unitCost: string;
}