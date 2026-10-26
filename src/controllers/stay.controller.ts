import type { NextFunction, Request, Response } from 'express';
import { stayService } from '../container.js';
import type { GuestLookupDTO, StayListQueryDTO } from '../schemas/stay.schema.js';

export default class StayController {
  static async findGuest(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await stayService.findGuest(req.user!.storeId, req.validatedQuery as GuestLookupDTO));
    } catch (err) {
      next(err);
    }
  }

  static async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await stayService.checkIn(req.user!.storeId, req.user!.userId, req.body));
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await stayService.list(req.user!.storeId, req.validatedQuery as StayListQueryDTO));
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await stayService.getById(req.user!.storeId, req.params.id as string));
    } catch (err) {
      next(err);
    }
  }

  static async addCharge(req: Request, res: Response, next: NextFunction) {
    try {
      const { storeId, userId } = req.user!;
      res.status(201).json(await stayService.addCharge(storeId, userId, req.params.id as string, req.body));
    } catch (err) {
      next(err);
    }
  }

  static async addPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { storeId, userId } = req.user!;
      res.status(201).json(await stayService.addPayment(storeId, userId, req.params.id as string, req.body));
    } catch (err) {
      next(err);
    }
  }

  static async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      const { storeId, userId } = req.user!;
      res.status(200).json(await stayService.checkOut(storeId, userId, req.params.id as string, req.body));
    } catch (err) {
      next(err);
    }
  }

  static async setMigrationsReported(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await stayService.setMigrationsReported(
        req.user!.storeId,
        req.params.id as string,
        req.body.reported,
      ));
    } catch (err) {
      next(err);
    }
  }
}
