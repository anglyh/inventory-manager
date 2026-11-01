import type { PoolClient } from 'pg';
import type { Product, ProductWithStock, ProductListItem, ProductSearchItem, ProductOption } from '../../models/product.model.js';
import type { CreateProductDTO, UpdateProductDTO } from '../../schemas/product.schema.js';

export type ListProductQuery = {
  storeId: string;
  search?: string | undefined;
  categoryIds?: string[] | undefined;
  withoutCategory?: boolean | undefined;
  /** Solo productos con stock en o bajo el mínimo. */
  lowStock?: boolean | undefined;
  limit: number;
  offset: number
}

export type ProductCountQuery = Omit<ListProductQuery, 'limit' | 'offset'>;

export interface IProductRepository {
  findById(productId: string, client?: PoolClient): Promise<ProductWithStock | null>;
  findForStore(storeId: string, productId: string, client?: PoolClient): Promise<ProductWithStock | null>;
  findByBarcode(storeId: string, barcode: string): Promise<Pick<Product, 'id' | 'name'> | null>;
  categoryBelongsToStore(storeId: string, categoryId: string, client: PoolClient): Promise<boolean>;
  listAll(filters: ListProductQuery): Promise<ProductListItem[]>;
  count(filters: ProductCountQuery): Promise<number>;
  create(storeId: string, productData: CreateProductDTO, client: PoolClient): Promise<Product>;
  update(storeId: string, id: string, productData: UpdateProductDTO, client: PoolClient): Promise<Product>;
  deactivate(storeId: string, id: string): Promise<void>;
  getStock(productId: string, client?: PoolClient): Promise<number>;
  findByIdForUpdate(productId: string, client: PoolClient): Promise<Product>;
  updateUnitCostAvg(productId: string, newAvg: number, client: PoolClient): Promise<void>;
  listProductOptions(storeId: string): Promise<ProductOption[]>;
  getByName(storeId: string, searchTerm: string): Promise<ProductSearchItem[]>;
}
