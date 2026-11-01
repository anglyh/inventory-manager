import type { Category } from '../../models/category.model.js';

export interface ICategoryRepository {
  create(storeId: string, categoryData: Pick<Category, 'name'>): Promise<Category>;
  listAll(storeId: string): Promise<Category[]>;
  findById(storeId: string, categoryId: string): Promise<Category | null>;
  update(storeId: string, categoryId: string, categoryData: Pick<Category, 'name'>): Promise<Category>;
  delete(storeId: string, categoryId: string): Promise<void>;
}
