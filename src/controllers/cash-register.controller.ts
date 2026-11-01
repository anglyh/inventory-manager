import type { NextFunction, Request, Response } from 'express';
import { cashRegisterService } from '../container.js';
import type {
  CashMovementHistoryDTO,
  CurrentCashMovementHistoryDTO,
  CashRegisterHistoryDTO,
} from '../schemas/cash-register.schema.js';

export default class CashRegisterController {
  static async open(req: Request, res: Response, next: NextFunction) {
    try {
      const register = await cashRegisterService.open(
        req.user!.storeId,
        req.user!.userId,
        req.body,
      );

      res.status(201).json(register);
    } catch (err) {
      next(err);
    }
  }

  static async current(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await cashRegisterService.current(req.user!.storeId, req.user!.role));
    } catch (err) {
      next(err);
    }
  }

  static async currentMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cashRegisterService.listCurrentMovements(
        req.user!.storeId,
        req.validatedQuery as CurrentCashMovementHistoryDTO,
        req.user!.role,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const register = await cashRegisterService.getById(
        req.user!.storeId,
        req.params.id as string,
        req.user!.role,
      );

      res.status(200).json(register);
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cashRegisterService.list(
        req.user!.storeId,
        req.validatedQuery as CashRegisterHistoryDTO,
        req.user!.role,
      );

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async listMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cashRegisterService.listMovements(
        req.user!.storeId,
        req.params.id as string,
        req.validatedQuery as CashMovementHistoryDTO,
        req.user!.role,
      );

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async addMovement(req: Request, res: Response, next: NextFunction) {
    try {
      await cashRegisterService.addMovement(
        req.user!.storeId,
        req.user!.userId,
        req.params.id as string,
        req.body,
        req.user!.role,
      );

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }

  static async close(req: Request, res: Response, next: NextFunction) {
    try {
      await cashRegisterService.close(
        req.user!.storeId,
        req.user!.userId,
        req.params.id as string,
        req.body,
        req.user!.role,
      );

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
}
