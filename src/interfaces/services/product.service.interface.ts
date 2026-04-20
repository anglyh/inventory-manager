import type { ListProductFilters, Product, ProductListItem, ProductSearchItem } from '../../models/product.model.js';
import type { PaginatedResult } from '../../types/api.types.js';

export interface IProductService {
  create(userId: string, productData: Product): Promise<Product>;
  listAll(filters: ListProductFilters): Promise<PaginatedResult<ProductListItem>>;
  update(newProductData: Product): Promise<Product>;
  deactivate(productId: string): Promise<void>;
  delete(productId: string): Promise<void>;
  listProductOptions(userId: string): Promise<ProductSearchItem[]>;
  getByName(userId: string, searchTerm: string): Promise<ProductSearchItem[]>;
}

