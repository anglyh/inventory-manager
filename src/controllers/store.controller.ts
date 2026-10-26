import type { NextFunction, Request, Response } from 'express';
import { storeService } from '../container.js';

export default class StoreController {
  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await storeService.getSettings(req.user!.storeId));
    } catch (err) {
      next(err);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await storeService.updateSettings(req.user!.storeId, req.body));
    } catch (err) {
      next(err);
    }
  }
}
