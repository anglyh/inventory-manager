import type { NextFunction, Request, Response } from 'express';
import { inventoryMovementService } from '../container.js';
import type { InventoryMovementsCursorQueryDTO } from '../schemas/inventory-movement.schema.js';

export default class InventoryMovementController {
  static async registerSale(req: Request, res: Response, next: NextFunction) {
    try {
      await inventoryMovementService.registerSale(req.user!.storeId, req.body);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }

  static async registerPurchase(req: Request, res: Response, next: NextFunction) {
    try {
      await inventoryMovementService.registerPurchase(req.user!.storeId, req.body);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }

  static async registerLoss(req: Request, res: Response, next: NextFunction) {
    try {
      await inventoryMovementService.registerLoss(req.user!.storeId, req.body);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }

  static async listByCursor(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.validatedQuery as InventoryMovementsCursorQueryDTO;
      res.status(200).json(await inventoryMovementService.listMovementsByCursor({
        ...query,
        storeId: req.user!.storeId,
      }));
    } catch (err) {
      next(err);
    }
  }

  static async registerInitialLoad(req: Request, res: Response, next: NextFunction) {
    try {
      await inventoryMovementService.registerInitialLoad(req.user!.storeId, req.body);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }

  static async registerAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      await inventoryMovementService.registerAdjustment(req.user!.storeId, req.body);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
}
