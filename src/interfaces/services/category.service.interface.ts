import type { Category } from '../../models/category.model.js';

export interface ICategoryService {
  create(userId: string, categoryData: Category): Promise<Category>;
  listAll(userId: string): Promise<Category[]>;
  update(userId: string, categoryId: string, categoryData: Pick<Category, 'name'>): Promise<Category>;
  delete(userId: string, categoryId: string): Promise<void>;
}

