import type { NextFunction, Request, Response } from 'express';
import { Unauthorized } from '../errors/app.error.js';
import { purchaseService } from '../container.js';

export default class PurchaseController {
  static async listAllPurchases(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 12;
      const startDate = req.query.startDate ? (req.query.startDate as string) : undefined
      const endDate = req.query.endDate ? (req.query.endDate as string) : undefined;

      const purchases = await purchaseService.listAllPurchases({
        userId: req.user.userId,
        page,
        limit,
        ...(startDate && endDate ? { startDate, endDate }: {}),
      });
      res.status(200).json(purchases)
    } catch (err) {
      next(err)
    }
  }

  static async registerPurchase(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");

      const purchase = await purchaseService.registerPurchase(req.user.userId, req.body);
      res.status(201).json(purchase);
    } catch (err) {
      next(err)
    }
  }
}