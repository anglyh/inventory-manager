import type { NextFunction, Request, Response } from 'express';
import { userService } from '../container.js';
import type { AuthResponse } from '../schemas/user.schema.js';

export default class UserController {
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
      return res.status(200).json({
        token: req.headers.authorization?.split(" ")[1],
        user: req.user
      });
    } catch (err) {
      next(err);
    }
  }
}
