import type { NextFunction, Request, Response } from 'express';
import { Unauthorized } from '../errors/app.error.js';
import { categoryService } from '../container.js';
import type { ApiResponse } from '../types/api.types.js';
import type { Category } from '../models/category.model.js';

export default class CategoryController {
  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");
      const category = await categoryService.create(req.user.userId, req.body);
      const response: ApiResponse<Category> = {
        data: category,
        message: "Categoria creada"
      }
      res.status(201).json(response)
    } catch (err) {
      next(err)
    }
  }

  static async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");
      const categories = await categoryService.listAll(req.user.userId);
      const response: ApiResponse<Category[]> = {
        data: categories,
      }
      res.status(200).json(response)
    } catch (err) {
      next(err)      
    }
  }
}