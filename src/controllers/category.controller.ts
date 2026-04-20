import type { NextFunction, Request, Response } from 'express';
import { categoryService } from '../container.js';

export default class CategoryController {
  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.create(req.user!.userId, req.body);
      res.status(201).json(category)
    } catch (err) {
      next(err)
    }
  }

  static async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await categoryService.listAll(req.user!.userId);
      res.status(200).json(categories)
    } catch (err) {
      next(err)
    }
  }
}