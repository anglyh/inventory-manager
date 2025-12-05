import type { Product } from '../models/product.model.js';
import ProductRepository from '../repositories/product.repository.js';

export default class ProductService {
  static async create(userId: string, productData: Product): Promise<Product> {
    const product = await ProductRepository.create(userId, productData);
    return product;
  }
  static async listAll(userId: string): Promise<Product[]> {
    const products = await ProductRepository.listAll(userId)
    return products;
  }
}