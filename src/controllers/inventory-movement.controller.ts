import type { NextFunction, Request, Response } from 'express';
import { Unauthorized } from '../errors/app.error.js';
import { inventoryMovementService } from '../container.js';

export default class InventoryMovementController {
  static async listEntries(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized('Usuario no autenticado');

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 12;

      const result = await inventoryMovementService.listAll({
        userId: req.user.userId,
        page,
        limit,
        movementType: 'IN',
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async listExits(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized('Usuario no autenticado');

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 12;

      const result = await inventoryMovementService.listAll({
        userId: req.user.userId,
        page,
        limit,
        movementType: 'OUT',
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async registerEntry(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized('Usuario no autenticado');

      const movement = await inventoryMovementService.registerEntry(req.user.userId, req.body);
      res.status(201).json(movement);
    } catch (err) {
      next(err);
    }
  }

  static async registerExit(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Unauthorized('Usuario no autenticado');

      const movement = await inventoryMovementService.registerExit(req.user.userId, req.body);
      res.status(201).json(movement);
    } catch (err) {
      next(err);
    }
  }
}
