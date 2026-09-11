import type { Category } from '../../models/category.model.js';

export interface ICategoryService {
  create(storeId: string, categoryData: Category): Promise<Category>;
  listAll(storeId: string): Promise<Category[]>;
  update(storeId: string, categoryId: string, categoryData: Pick<Category, 'name'>): Promise<Category>;
  delete(storeId: string, categoryId: string): Promise<void>;
}

