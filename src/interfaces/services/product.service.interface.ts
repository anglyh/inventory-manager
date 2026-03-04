import type { Product } from '../../models/product.model.js';
import type { PaginatedResult } from '../../types/api.types.js';

export interface IProductService {
  create(userId: string, productData: Product): Promise<Product>;
  listAll(userId: string, page: number, limit: number): Promise<PaginatedResult<Product>>;
  update(newProductData: Product): Promise<Product>;
  delete(productId: string): Promise<Product>;
}

