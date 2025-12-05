import type { Category } from '../models/category.model.js';
import CategoryRepository from '../repositories/category.repository.js';

export default class CategoryService {
  static async create(userId: string, categoryData: Category) {
    const category = await CategoryRepository.create(userId, categoryData);
    return category;
  }

  static async listAll(userId: string) {
    const categories = await CategoryRepository.listAll(userId);
    return categories;
  }
}