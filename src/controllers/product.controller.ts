import type { NextFunction, Request, Response } from 'express';
import type { Product } from '../models/product.model.js';
import ProductService from '../services/product.service.js';
import type { ApiResponse } from '../types/api.types.js';
import { Unauthorized } from '../errors/app.error.js';

export default class ProductController {
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");
      
      const product = await ProductService.create(req.user.userId, req.body);
      const response: ApiResponse<Product> = {
        data: product,
        message: "Producto creado correctamente"
      };
      res.status(201).json(response)
    } catch (err) {
      next(err)
    }
  }

  static async listAllProducts(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");

      const products = await ProductService.listAll(req.user.userId)
      const response: ApiResponse<Product[]> = {
        data: products,
      }
      res.status(200).json(response)
    } catch (err) {
      next(err)
    }
  }
}

