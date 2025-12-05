import type { NextFunction, Request, Response } from 'express';
import { Unauthorized } from '../errors/app.error.js';
import SaleService from '../services/sale.service.js';
import type { ApiResponse } from '../types/api.types.js';

export default class SaleController {
  static async createSale(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");
      
      const sale = await SaleService.createSale(req.user.userId, req.body);

      const response: ApiResponse<any> = {
        data: sale,
        message: "Venta registrada correctamente"
      }
      res.status(201).json(response)
    } catch (err) {
      next(err)
    }
  }
}