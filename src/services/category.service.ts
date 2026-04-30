import type { Category } from '../models/category.model.js';
import type { ICategoryRepository } from '../interfaces/repositories/category.repository.interface.js';
import type { ICategoryService } from '../interfaces/services/category.service.interface.js';
import { NotFoundError } from '../errors/app.error.js';

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

  async update(
    userId: string,
    categoryId: string,
    categoryData: Pick<Category, 'name'>
  ): Promise<Category> {
    const existing = await this.categoryRepo.findById(userId, categoryId);
    if (!existing) throw new NotFoundError("No existe la categoría");

    const updated = await this.categoryRepo.update(userId, categoryId, categoryData);
    return updated;
  }

  async delete(userId: string, categoryId: string): Promise<void> {
    const existing = await this.categoryRepo.findById(userId, categoryId);
    if (!existing) throw new NotFoundError("No existe la categoría");

    await this.categoryRepo.delete(userId, categoryId);
  }
}