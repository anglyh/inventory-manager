import type { Category } from '../../models/category.model.js';

export interface ICategoryRepository {
  create(userId: string, categoryData: Category): Promise<Category>;
  listAll(userId: string): Promise<Category[]>;
  findById(userId: string, categoryId: string): Promise<Category | null>;
  update(userId: string, categoryId: string, categoryData: Pick<Category, 'name'>): Promise<Category>;
  delete(userId: string, categoryId: string): Promise<void>;
}

