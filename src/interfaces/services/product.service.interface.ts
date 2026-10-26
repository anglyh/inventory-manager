import type { Product, ProductWithStock, ProductListItem, ProductSearchItem, ProductOption } from '../../models/product.model.js';
import type { CreateProductDTO, UpdateProductDTO } from '../../schemas/product.schema.js';

export type ListProductFilters = {
  storeId: string;
  search?: string | undefined;
  categoryIds?: string[] | undefined;
  withoutCategory?: boolean | undefined;
  page: number;
  limit: number;
}
import type { PaginatedResult } from '../../types/api.types.js';

export interface IProductService {
  create(storeId: string, productData: CreateProductDTO): Promise<Product>;
  getById(storeId: string, id: string): Promise<ProductWithStock>;
  listAll(filters: ListProductFilters): Promise<PaginatedResult<ProductListItem>>;
  update(storeId: string, id: string, data: UpdateProductDTO): Promise<Product>;
  deactivate(storeId: string, productId: string): Promise<void>;
  listProductOptions(storeId: string): Promise<ProductOption[]>;
  getByName(storeId: string, searchTerm: string): Promise<ProductSearchItem[]>;
}
