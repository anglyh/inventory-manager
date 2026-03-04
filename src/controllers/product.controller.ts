import type { NextFunction, Request, Response } from 'express';
import { productService } from '../container.js';
import { BadRequest, Unauthorized } from '../errors/app.error.js';

export default class ProductController {
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");

      const product = await productService.create(req.user.userId, req.body);
      res.status(201).json(product)
    } catch (err) {
      next(err)
    }
  }

  static async listAllProducts(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const result = await productService.listAll(req.user.userId, page, limit)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");

      const product = await productService.update({ id: req.params.id as string, ...req.body })
      res.status(200).json(product)
    } catch (err) {
      next(err)
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");
      if (!req.params.id) throw new BadRequest("No se ha enviado un id de producto")

      await productService.delete(req.params.id as string);
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  }
}
