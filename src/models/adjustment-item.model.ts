import type { Adjustment } from './adjustment.model.js';
import type { Product } from './product.model.js';

export interface AdjustmentItem {
  id: string;
  productId: Product["id"];
  adjustmentId: Adjustment["id"];
  productName: Product["name"];
  quantity: number;
}

export interface AdjustmentItemInsert {
  productId: string;
  productName: string;
  quantity: number;
}