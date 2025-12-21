import type { Product } from './product.model.js';
import type { Sale } from './sale.model.js';

export interface SaleItem {
  id: string;
  saleId: Sale["id"]
  productId: Product["id"]
  quantity: number;
  salePrice: string;
  unitCost: number;
}

export interface SaleItemInsert {
  productId: string;
  quantity: number;
  productName: string;
  salePrice: string;
  unitCost: string;
}