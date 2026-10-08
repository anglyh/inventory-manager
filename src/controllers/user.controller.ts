import type { NextFunction, Request, Response } from 'express';
import { userService } from '../container.js';

export default class UserController {
  static async listStoreUsers(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await userService.listStoreUsers(req.user!.storeId));
    } catch (err) { next(err); }
  }

  static async createStoreUser(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await userService.createStoreUser(req.user!.storeId, req.body));
    } catch (err) { next(err); }
  }

  static async signUp(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.register(req.body);
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.login(req.body);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async checkStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.split(" ")[1] ?? '';
      return res.status(200).json(userService.getSession(req.user!, token));
    } catch (err) {
      next(err);
    }
  }
}
