import type { NextFunction, Request, Response } from 'express';
import { Unauthorized } from '../errors/app.error.js';
import { saleService } from '../container.js';
import type { ApiResponse } from '../types/api.types.js';
import type { SaleDetailResponse } from '../models/sale.model.js';

export default class SaleController {
  static async createSale(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");
      
      const sale = await saleService.registerSale(req.user.userId, req.body);

      const response: ApiResponse<SaleDetailResponse> = {
        data: sale,
        message: "Venta registrada correctamente"
      }
      res.status(201).json(response)
    } catch (err) {
      next(err)
    }
  }

  static async listAllSales(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no encontrado");
      const sales = await saleService.listAllSales(req.user.userId);
      const response: ApiResponse<SaleDetailResponse[]> = { data: sales }
      res.status(200).json(response)
    } catch (err) {
      next(err)
    }
  }
}