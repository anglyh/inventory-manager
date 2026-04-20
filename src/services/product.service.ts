import type { ListProductFilters, Product, ProductListItem, ProductSearchItem } from '../models/product.model.js';
import type { IProductRepository } from '../interfaces/repositories/product.repository.interface.js';
import type { IProductService } from '../interfaces/services/product.service.interface.js';
import { NotFoundError } from '../errors/app.error.js';
import type { PaginatedResult } from '../types/api.types.js';

export default class ProductService implements IProductService {
  constructor(private productRepo: IProductRepository) { }

  async create(userId: string, productData: Product): Promise<Product> {
    const product = await this.productRepo.create(userId, productData);
    return product;
  }

  async listAll(filters: ListProductFilters): Promise<PaginatedResult<ProductListItem>> {
    const { userId, categoryId, search, limit, page } = filters

    const offset = (page - 1) * limit;

    const [products, totalProducts] = await Promise.all([
      this.productRepo.listAll({ userId, categoryId, search, limit, offset }),
      this.productRepo.count({ userId, categoryId, search })
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

  async listProductOptions(userId: string): Promise<ProductSearchItem[]> {
    return this.productRepo.listProductOptions(userId);
  }

  async getByName(userId: string, searchTerm: string): Promise<ProductSearchItem[]> {
    const products = await this.productRepo.getByName(userId, searchTerm)
    return products
  }
}