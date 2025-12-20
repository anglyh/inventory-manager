import type { Category } from './category.model.js';
import type { User } from './user.model.js';

export interface Product {
  id: string;
  userId: User["id"];
  name: string;
  salePrice: string;
  barcode?: string | null;
  unitCostAvg: string;
  minStock: number;
  categoryId: Category["id"];
  createdAt: Date;
  isActive: boolean
}

export type ProductWithStock = Product & {
  stock: number;
}