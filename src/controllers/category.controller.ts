import type { NextFunction, Request, Response } from 'express';
import { categoryService } from '../container.js';
import { BadRequestError } from '../errors/app.error.js';

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

  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = req.params.id as string | undefined;
      if (!categoryId) throw new BadRequestError("No se ha enviado un id de categoría");

      const updated = await categoryService.update(req.user!.userId, categoryId, req.body);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = req.params.id as string | undefined;
      if (!categoryId) throw new BadRequestError("No se ha enviado un id de categoría");

      await categoryService.delete(req.user!.userId, categoryId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}