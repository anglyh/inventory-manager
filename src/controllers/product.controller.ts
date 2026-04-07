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
      const limit = Number(req.query.limit) || 12;
      const searchTerm = typeof req.query.searchTerm === 'string'
        ? req.query.searchTerm.trim()
        : ''

      const result = await productService.listAll(req.user.userId, page, limit, searchTerm)
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

      await productService.deactivate(req.params.id as string);
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  }

  static async listProductOptions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");
      const products = await productService.listProductOptions(req.user.userId);
      res.status(200).json(products);
    } catch (err) {
      next(err);
    }
  }

  static async getByName(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized("Usuario no autenticado");
      const searchTerm = req.query.searchTerm?.toString() ?? ''
      const products = await productService.getByName(req.user.userId, searchTerm)
      res.status(200).json(products)
    } catch (err) {
      next(err)
    }
  }
}
