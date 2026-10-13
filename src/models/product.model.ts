import type { Category } from './category.model.js';

export interface Product {
  id: string;
  storeId: string;
  name: string;
  salePrice: string;
  barcode: string | null;
  unitCostAvg: string | null;
  minStock: number;
  categoryId: Category["id"] | null;
  createdAt: Date;
  isActive: boolean
}

export type ProductWithStock = Product & {
  stock: number;
}

export type ProductListItem = Omit<ProductWithStock, 'storeId'> & {
  categoryName: string | null;
}

export type ProductSearchItem = Pick<Product, 'id' | 'name' | 'salePrice'>;
export type ProductOption = ProductSearchItem & Pick<ProductWithStock, 'barcode' | 'stock'> & {
  categoryName: string | null;
  hasMovements: boolean;
};
