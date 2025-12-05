import { query } from '../db/index.js';
import type { Category } from '../models/category.model.js';
import { snakeToCamel } from '../utils/mapper.js';

export default class CategoryRepository {
  static async create(userId: string, categoryData: Category) {
    const { name, icon } = categoryData
    const result = await query(
      `INSERT INTO category (user_id, name, icon)
       VALUES ($1, $2, $3)
       RETURNING *
      `, [userId, name, icon ?? null]
    );
    return snakeToCamel(result.rows[0])
  }

  static async listAll(userId: string) {
    const result = await query(
      ` SELECT * FROM category
        WHERE user_id = $1
      `, [userId]
    )
    return snakeToCamel(result.rows)
  }
}