import type { NextFunction, Request, Response } from 'express';
import { inventoryMovementService } from '../container.js';
import { inventoryMovementsCursorQuerySchema } from '../schemas/inventory-movement.schema.js';

export default class InventoryMovementController {
  static async listEntriesByCursor(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, cursorDate, cursorId } = inventoryMovementsCursorQuerySchema.parse(req.query)

      const result = await inventoryMovementService.listMovementsByCursor({
        userId: req.user!.userId,
        limit,
        cursorDate: cursorDate || undefined,
        cursorId: cursorId || undefined,
        movementType: 'IN',
      })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  static async listExitsByCursor(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, cursorDate, cursorId } = inventoryMovementsCursorQuerySchema.parse(req.query)

      const result = await inventoryMovementService.listMovementsByCursor({
        userId: req.user!.userId,
        limit,
        cursorDate: cursorDate || undefined,
        cursorId: cursorId || undefined,
        movementType: 'OUT',
      })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  static async registerEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const movement = await inventoryMovementService.registerEntry(req.user!.userId, req.body);
      res.status(201).json(movement);
    } catch (err) {
      next(err);
    }
  }

  static async registerExit(req: Request, res: Response, next: NextFunction) {
    try {
      const movement = await inventoryMovementService.registerExit(req.user!.userId, req.body);
      res.status(201).json(movement);
    } catch (err) {
      next(err);
    }
  }
}
