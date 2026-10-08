import type { Request, Response, NextFunction } from 'express';
import { supplierService } from '../container.js';

export default class SupplierController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await supplierService.list(req.user!.storeId));
    } catch (err) { next(err); }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await supplierService.create(req.user!.storeId, req.body));
    } catch (err) { next(err); }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await supplierService.update(req.user!.storeId, req.params.id as string, req.body));
    } catch (err) { next(err); }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await supplierService.delete(req.user!.storeId, req.params.id as string);
      res.status(204).end();
    } catch (err) { next(err); }
  }
}
