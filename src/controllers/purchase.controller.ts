import type { NextFunction, Request, Response } from 'express';
import { Unauthorized } from '../errors/app.error.js';
import { purchaseService } from '../container.js';
import type { ApiResponse } from '../types/api.types.js';
import type { PurchaseDetailResponse } from '../models/purchase.model.js';

export default class PurchaseController {
  static async listAllPurchases(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");

      const purchases = await purchaseService.listAllPurchases(req.user.userId);
      const response: ApiResponse<any> = {
        data: purchases
      }
      res.status(200).json(response)
    } catch (err) {
      next(err)
    }
  }

  static async registerPurchase(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");
      
      const purchase = await purchaseService.registerPurchase(req.user.userId, req.body);
      const response: ApiResponse<PurchaseDetailResponse> = {
        data: purchase,
        message: "Compra registrada correctamente"
      }
      res.status(201).json(response);
    } catch (err) {
      next(err)
    }
  }
}