import type { Product, ProductListItem, ProductSearchItem } from '../models/product.model.js';
import type { IProductRepository } from '../interfaces/repositories/product.repository.interface.js';
import type { IProductService, ListProductFilters } from '../interfaces/services/product.service.interface.js';
import { NotFoundError } from '../errors/app.error.js';
import type { PaginatedResult } from '../types/api.types.js';
import { withTransaction } from '../db/transactions.js';
import type { CreateProductDTO, UpdateProductDTO } from '../schemas/product.schema.js';

export default class ProductService implements IProductService {
  constructor(private productRepo: IProductRepository) { }

  async create(storeId: string, data: CreateProductDTO): Promise<Product> {
    return withTransaction(async client => {
      if (data.categoryId && !await this.productRepo.categoryBelongsToStore(storeId, data.categoryId, client)) {
        throw new NotFoundError('La categoría no existe');
      }
      return this.productRepo.create(storeId, data, client);
    });
  }

  async getById(storeId: string, id: string) {
    const product = await this.productRepo.findForStore(storeId, id);
    if (!product) throw new NotFoundError('El producto no existe');
    return product;
  }

  async listAll(filters: ListProductFilters): Promise<PaginatedResult<ProductListItem>> {
    const { storeId, categoryIds, withoutCategory, lowStock, search, limit, page } = filters

    const offset = (page - 1) * limit;

    const [products, totalProducts] = await Promise.all([
      this.productRepo.listAll({ storeId, categoryIds, withoutCategory, lowStock, search, limit, offset }),
      this.productRepo.count({ storeId, categoryIds, withoutCategory, lowStock, search })
    ])

    const totalPages = Math.ceil(totalProducts / limit)

    return {
      data: products,
      totalItems: totalProducts,
      totalPages,
    }
  }

  async update(storeId: string, id: string, data: UpdateProductDTO): Promise<Product> {
    return withTransaction(async client => {
      if (!await this.productRepo.findForStore(storeId, id, client)) {
        throw new NotFoundError('El producto no existe');
      }
      if (data.categoryId && !await this.productRepo.categoryBelongsToStore(storeId, data.categoryId, client)) {
        throw new NotFoundError('La categoría no existe');
      }
      return this.productRepo.update(storeId, id, data, client);
    });
  }

  async deactivate(storeId: string, productId: string): Promise<void> {
    await this.productRepo.deactivate(storeId, productId);
  }

  async listProductOptions(storeId: string) {
    return this.productRepo.listProductOptions(storeId);
  }

  async getByName(storeId: string, searchTerm: string): Promise<ProductSearchItem[]> {
    const products = await this.productRepo.getByName(storeId, searchTerm)
    return products
  }
}
