import type { Product, ProductListItem, ProductSearchItem } from '../models/product.model.js';
import type { IProductRepository } from '../interfaces/repositories/product.repository.interface.js';
import type { IProductService, ListProductFilters } from '../interfaces/services/product.service.interface.js';
import { NotFoundError } from '../errors/app.error.js';
import type { PaginatedResult } from '../types/api.types.js';

export default class ProductService implements IProductService {
  constructor(private productRepo: IProductRepository) { }

  async create(storeId: string, productData: Product): Promise<Product> {
    const product = await this.productRepo.create(storeId, productData);
    return product;
  }

  async listAll(filters: ListProductFilters): Promise<PaginatedResult<ProductListItem>> {
    const { storeId, categoryNames, search, limit, page } = filters

    const offset = (page - 1) * limit;

    const [products, totalProducts] = await Promise.all([
      this.productRepo.listAll({ storeId, categoryNames, search, limit, offset }),
      this.productRepo.count({ storeId, categoryNames, search })
    ])

    const totalPages = Math.ceil(totalProducts / limit)

    return {
      data: products,
      totalItems: totalProducts,
      totalPages,
    }
  }

  async update(newProductData: Product): Promise<Product> {
    const product = await this.productRepo.findById(newProductData.id);

    if (!product) throw new NotFoundError("No existe el producto");

    const updatedProduct = await this.productRepo.update(newProductData);
    return updatedProduct;
  }

  async deactivate(productId: string): Promise<void> {
    const product = await this.productRepo.findById(productId);

    if (!product) throw new NotFoundError("No existe el producto");

    await this.productRepo.deactivate(productId)
  }

  async delete(productId: string): Promise<void> {}

  async listProductOptions(storeId: string): Promise<ProductSearchItem[]> {
    return this.productRepo.listProductOptions(storeId);
  }

  async getByName(storeId: string, searchTerm: string): Promise<ProductSearchItem[]> {
    const products = await this.productRepo.getByName(storeId, searchTerm)
    return products
  }
}