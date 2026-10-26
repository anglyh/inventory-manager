import type { NextFunction, Request, Response } from 'express';
import { expenseService } from '../container.js';
import type { ExpenseListQueryDTO } from '../schemas/expense.schema.js';

export default class ExpenseController {
  static async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await expenseService.listCategories(req.user!.storeId));
    } catch (err) {
      next(err);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await expenseService.createCategory(req.user!.storeId, req.body));
    } catch (err) {
      next(err);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await expenseService.updateCategory(req.user!.storeId, req.params.id as string, req.body));
    } catch (err) {
      next(err);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      await expenseService.deleteCategory(req.user!.storeId, req.params.id as string);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await expenseService.list(req.user!.storeId, req.validatedQuery as ExpenseListQueryDTO));
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await expenseService.create(req.user!.storeId, req.user!.userId, req.body));
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await expenseService.delete(req.user!.storeId, req.params.id as string);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
}
