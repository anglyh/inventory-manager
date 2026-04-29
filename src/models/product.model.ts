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
  categoryId: Category["id"] | null;
  createdAt: Date;
  isActive: boolean
}

export type ProductWithStock = Product & {
  stock: number;
}

export type ProductListItem = ProductWithStock & {
  categoryName: string | null;
}

export type ListProductQuery = {
  userId: string;
  search?: string | undefined;
  categoryId?: string | undefined;
  limit: number;
  offset: number
}

export type ListProductFilters = {
  userId: string;
  search?: string | undefined;
  categoryId?: string | undefined;
  page: number;
  limit: number;
}

export type ProductSearchItem = Pick<Product, 'id' | 'name' | 'salePrice' | 'barcode'>;