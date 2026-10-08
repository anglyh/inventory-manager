import type { Category } from '../models/category.model.js';
import type { ICategoryRepository } from '../interfaces/repositories/category.repository.interface.js';
import type { ICategoryService } from '../interfaces/services/category.service.interface.js';
import { NotFoundError } from '../errors/app.error.js';

export default class CategoryService implements ICategoryService {
  constructor(private categoryRepo: ICategoryRepository) {}

  async create(storeId: string, categoryData: Pick<Category, 'name'>): Promise<Category> {
    const category = await this.categoryRepo.create(storeId, categoryData);
    return category;
  }

  async listAll(storeId: string): Promise<Category[]> {
    const categories = await this.categoryRepo.listAll(storeId);
    return categories;
  }

  async update(
    storeId: string,
    categoryId: string,
    categoryData: Pick<Category, 'name'>
  ): Promise<Category> {
    const existing = await this.categoryRepo.findById(storeId, categoryId);
    if (!existing) throw new NotFoundError("No existe la categoría");

    const updated = await this.categoryRepo.update(storeId, categoryId, categoryData);
    return updated;
  }

  async delete(storeId: string, categoryId: string): Promise<void> {
    const existing = await this.categoryRepo.findById(storeId, categoryId);
    if (!existing) throw new NotFoundError("No existe la categoría");

    await this.categoryRepo.delete(storeId, categoryId);
  }
}
