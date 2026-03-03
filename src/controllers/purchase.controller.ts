import type { NextFunction, Request, Response } from 'express';
import { Unauthorized } from '../errors/app.error.js';
import { purchaseService } from '../container.js';

export default class PurchaseController {
  static async listAllPurchases(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");

      const purchases = await purchaseService.listAllPurchases(req.user.userId);
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