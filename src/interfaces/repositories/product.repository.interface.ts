import type { PoolClient } from 'pg';
import type { Product, ProductWithStock, ProductListItem, ProductSearchItem } from '../../models/product.model.js';

export type ListProductQuery = {
  storeId: string;
  search?: string | undefined;
  categoryNames?: string[] | undefined;
  limit: number;
  offset: number
}

export interface IProductRepository {
  findById(productId: string, client?: PoolClient): Promise<ProductWithStock | null>;
  listAll(filters: ListProductQuery): Promise<ProductListItem[]>;
  count(filters: Pick<ListProductQuery, 'storeId' | 'search' | 'categoryNames'>): Promise<number>;
  create(storeId: string, productData: Product): Promise<Product>;
  update(productData: Product, client?: PoolClient): Promise<Product>;
  deactivate(id: string): Promise<Product>;
  getStock(productId: string, client?: PoolClient): Promise<number>;
  findByIdForUpdate(productId: string, client: PoolClient): Promise<Product>;
  updateUnitCostAvg(productId: string, newAvg: number, client: PoolClient): Promise<void>;
  listProductOptions(storeId: string): Promise<ProductSearchItem[]>;
  getByName(storeId: string, searchTerm: string): Promise<ProductSearchItem[]>;
}