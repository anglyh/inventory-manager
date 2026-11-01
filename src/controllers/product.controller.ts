import type { NextFunction, Request, Response } from 'express';
import { barcodeLookupService, productService } from '../container.js';
import { BadRequestError } from '../errors/app.error.js';
import { listProductPaginationSchema } from '../schemas/product.schema.js';

export default class ProductController {
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.create(req.user!.storeId, req.body);
      res.status(201).json(product)
    } catch (err) {
      next(err)
    }
  }

  static async listAllProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, page, categoryId, searchTerm, stock } = listProductPaginationSchema.parse(req.query)

      const result = await productService.listAll({
        storeId: req.user!.storeId,
        ...categoryId,
        search: searchTerm,
        lowStock: stock === 'low',
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
      const product = await productService.update(req.user!.storeId, req.params.id as string, req.body)
      res.status(200).json(product)
    } catch (err) {
      next(err)
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.params.id) throw new BadRequestError("No se ha enviado un id de producto")

      await productService.deactivate(req.user!.storeId, req.params.id as string);
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  }

  static async listProductOptions(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await productService.listProductOptions(req.user!.storeId);
      res.status(200).json(products);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await productService.getById(req.user!.storeId, req.params.id as string));
    } catch (err) {
      next(err);
    }
  }

  static async lookupBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await barcodeLookupService.lookup(req.user!.storeId, req.params.code as string));
    } catch (err) {
      next(err);
    }
  }

  static async getByName(req: Request, res: Response, next: NextFunction) {
    try {
      const searchTerm = req.query.searchTerm?.toString() ?? ''
      const products = await productService.getByName(req.user!.storeId, searchTerm)
      res.status(200).json(products)
    } catch (err) {
      next(err)
    }
  }
}
