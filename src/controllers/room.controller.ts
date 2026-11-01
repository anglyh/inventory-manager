import type { NextFunction, Request, Response } from 'express';
import { roomService } from '../container.js';

export default class RoomController {
  static async listTypes(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await roomService.listTypes(req.user!.storeId));
    } catch (err) {
      next(err);
    }
  }

  static async createType(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await roomService.createType(req.user!.storeId, req.body));
    } catch (err) {
      next(err);
    }
  }

  static async updateType(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await roomService.updateType(req.user!.storeId, req.params.id as string, req.body));
    } catch (err) {
      next(err);
    }
  }

  static async deleteType(req: Request, res: Response, next: NextFunction) {
    try {
      await roomService.deleteType(req.user!.storeId, req.params.id as string);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await roomService.list(req.user!.storeId));
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await roomService.create(req.user!.storeId, req.body));
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await roomService.update(req.user!.storeId, req.params.id as string, req.body));
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await roomService.delete(req.user!.storeId, req.params.id as string);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }

  static async markCleaned(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await roomService.markCleaned(req.user!.storeId, req.params.id as string));
    } catch (err) {
      next(err);
    }
  }
}
