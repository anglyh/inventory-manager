import type { NextFunction, Request, Response } from 'express';
import { userService } from '../container.js';
import type { ApiResponse } from '../types/api.types.js';
import type { AuthResponse } from '../schemas/user.schema.js';

export default class UserController {
  static async signUp(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.register(req.body);
      const response: ApiResponse<AuthResponse> = { data: result }
      return res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.login(req.body);
      const response: ApiResponse<AuthResponse> = { data: result }
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
