import type { Product } from './product.model.js';
import type { Sale } from './sale.model.js';

export interface SaleItem {
  id: string;
  saleId: Sale["id"]
  productId: Product["id"]
  productName: string
  quantity: number;
  salePrice: string;
  unitCost: number;
}

export interface SaleItemInsert {
  productId: string;
  productName: string;
  quantity: number;
  salePrice: string;
  unitCost: string;
}