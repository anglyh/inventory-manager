import type { Product } from '../../models/product.model.js';

export interface IProductService {
  create(userId: string, productData: Product): Promise<Product>;
  listAll(userId: string): Promise<Product[]>;
  update(newProductData: Product): Promise<Product>;
  delete(productId: string): Promise<Product>;
}

