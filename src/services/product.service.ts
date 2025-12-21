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
  static async update(newProductData: Product): Promise<Product> {
    const product = await ProductRepository.findById(newProductData.id);

    if (!product) throw new Error("No existe el producto");

    const updatedProduct = await ProductRepository.update(newProductData);
    return updatedProduct;
  }
  static async delete(productId: string) {
    const product = await ProductRepository.findById(productId);

    if (!product) throw new Error("No existe el producto");

    const deactivatedProduct = await ProductRepository.deactivate(productId)
    return deactivatedProduct;
  }
}