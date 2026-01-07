import type { Category } from '../models/category.model.js';
import type { ICategoryRepository } from '../interfaces/repositories/category.repository.interface.js';
import type { ICategoryService } from '../interfaces/services/category.service.interface.js';

export default class CategoryService implements ICategoryService {
  constructor(private categoryRepo: ICategoryRepository) {}

  async create(userId: string, categoryData: Category): Promise<Category> {
    const category = await this.categoryRepo.create(userId, categoryData);
    return category;
  }

  async listAll(userId: string): Promise<Category[]> {
    const categories = await this.categoryRepo.listAll(userId);
    return categories;
  }
}