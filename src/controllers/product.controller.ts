import type { NextFunction, Request, Response } from 'express';
import { productService } from '../container.js';
import { BadRequestError } from '../errors/app.error.js';
import { listProductPaginationSchema } from '../schemas/product.schema.js';

export default class ProductController {
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.create(req.user!.userId, req.body);
      res.status(201).json(product)
    } catch (err) {
      next(err)
    }
  }

  static async listAllProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, page, categoryId, searchTerm } = listProductPaginationSchema.parse(req.query)

      const result = await productService.listAll({
        userId: req.user!.userId,
        categoryId,
        search: searchTerm,
        page,
        limit,
      })

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.update({ id: req.params.id as string, ...req.body })
      res.status(200).json(product)
    } catch (err) {
      next(err)
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.params.id) throw new BadRequestError("No se ha enviado un id de producto")

      await productService.deactivate(req.params.id as string);
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  }

  static async listProductOptions(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await productService.listProductOptions(req.user!.userId);
      res.status(200).json(products);
    } catch (err) {
      next(err);
    }
  }

  static async getByName(req: Request, res: Response, next: NextFunction) {
    try {
      const searchTerm = req.query.searchTerm?.toString() ?? ''
      const products = await productService.getByName(req.user!.userId, searchTerm)
      res.status(200).json(products)
    } catch (err) {
      next(err)
    }
  }
}
