import type { PoolClient } from 'pg';
import type { Product, ProductWithStock, ProductListItem, ProductSearchItem } from '../../models/product.model.js';
import type { PaginatedData } from '../../types/api.types.js';

export interface IProductRepository {
  findById(productId: string, client?: PoolClient): Promise<ProductWithStock | null>;
  listAll(userId: string, page: number, limit: number, searchTerm?: string): Promise<PaginatedData<ProductListItem>>;
  create(userId: string, productData: Product): Promise<Product>;
  update(productData: Product, client?: PoolClient): Promise<Product>;
  deactivate(id: string): Promise<Product>;
  getStock(productId: string, client?: PoolClient): Promise<number>;
  findByIdForUpdate(productId: string, client: PoolClient): Promise<Product>;
  updateUnitCostAvg(productId: string, newAvg: number, client: PoolClient): Promise<void>;
  listProductOptions(userId: string): Promise<ProductSearchItem[]>;
  getByName(userId: string, searchTerm: string): Promise<ProductSearchItem[]>;
}