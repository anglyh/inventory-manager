import { query } from '../db/index.js';
import type { Category } from '../models/category.model.js';
import { snakeToCamel } from '../utils/mapper.js';
import type { ICategoryRepository } from '../interfaces/repositories/category.repository.interface.js';

export default class CategoryRepository implements ICategoryRepository {
  async create(userId: string, categoryData: Category): Promise<Category> {
    const { name, icon } = categoryData
    const result = await query(
      `INSERT INTO category (user_id, name, icon)
       VALUES ($1, $2, $3)
       RETURNING *
      `, [userId, name, icon ?? null]
    );
    return snakeToCamel(result.rows[0])
  }

  async listAll(userId: string): Promise<Category[]> {
    const result = await query(
      ` SELECT * FROM category
        WHERE user_id = $1
      `, [userId]
    )
    return snakeToCamel(result.rows)
  }
}