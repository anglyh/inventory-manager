import type { PoolClient } from 'pg';
import type { Product, ProductWithStock } from '../../models/product.model.js';

export interface IProductRepository {
  findById(productId: string, client?: PoolClient): Promise<ProductWithStock>;
  listAll(userId: string, page: number, limit: number): Promise<{ products: ProductWithStock[], totalItems: number }>;
  create(userId: string, productData: Product): Promise<Product>;
  update(productData: Product, client?: PoolClient): Promise<Product>;
  deactivate(id: string): Promise<Product>;
  getStock(productId: string, client?: PoolClient): Promise<number>;
  findByIdForUpdate(productId: string, client: PoolClient): Promise<Product>;
  updateUnitCostAvg(productId: string, newAvg: number, client: PoolClient): Promise<void>;
}