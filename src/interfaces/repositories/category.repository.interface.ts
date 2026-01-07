import type { Category } from '../../models/category.model.js';

export interface ICategoryRepository {
  create(userId: string, categoryData: Category): Promise<Category>;
  listAll(userId: string): Promise<Category[]>;
}

