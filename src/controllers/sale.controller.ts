import type { NextFunction, Request, Response } from 'express';
import { Unauthorized } from '../errors/app.error.js';
import { saleService } from '../container.js';

export default class SaleController {
  static async createSale(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");

      const sale = await saleService.registerSale(req.user.userId, req.body);
      res.status(201).json(sale)
    } catch (err) {
      next(err)
    }
  }

  static async listAllSales(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no encontrado");
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 12;

      const sales = await saleService.listAllSales(req.user.userId, page, limit);
      res.status(200).json(sales)
    } catch (err) {
      next(err)
    }
  }
}