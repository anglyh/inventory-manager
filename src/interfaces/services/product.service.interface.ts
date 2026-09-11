import type { Product, ProductListItem, ProductSearchItem } from '../../models/product.model.js';

export type ListProductFilters = {
  storeId: string;
  search?: string | undefined;
  categoryNames?: string[] | undefined;
  page: number;
  limit: number;
}
import type { PaginatedResult } from '../../types/api.types.js';

export interface IProductService {
  create(storeId: string, productData: Product): Promise<Product>;
  listAll(filters: ListProductFilters): Promise<PaginatedResult<ProductListItem>>;
  update(newProductData: Product): Promise<Product>;
  deactivate(productId: string): Promise<void>;
  delete(productId: string): Promise<void>;
  listProductOptions(storeId: string): Promise<ProductSearchItem[]>;
  getByName(storeId: string, searchTerm: string): Promise<ProductSearchItem[]>;
}

