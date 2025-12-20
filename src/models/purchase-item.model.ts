import type { Product } from './product.model.js';
import type { Purchase } from './purchase.model.js';

export interface PurchaseItem {
  id: string;
  productId: Product["id"];
  purchaseId: Purchase["id"]
  productName: string;
  quantity: number;
  unitCost: string;
}

export interface PurchaseItemInsert {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: string;
}