import type { NextFunction, Request, Response } from 'express';
import { userService } from '../container.js';
import { UnauthorizedError } from '../errors/app.error.js';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from '../lib/refresh-token-cookie.js';

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

  static async setStoreUserActive(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await userService.setStoreUserActive(req.user!.storeId, req.params.id as string, req.body.active));
    } catch (err) { next(err); }
  }

  static async signUp(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken, ...body } = await userService.register(req.body);
      setRefreshCookie(res, refreshToken);
      return res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken, ...body } = await userService.login(req.body);
      setRefreshCookie(res, refreshToken);
      return res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const currentToken = readRefreshCookie(req);
      if (!currentToken) throw new UnauthorizedError('Sesión inválida');

      const { refreshToken, ...body } = await userService.refreshSession(currentToken);
      setRefreshCookie(res, refreshToken);
      return res.status(200).json(body);
    } catch (err) {
      // A dead session drops its cookie; a database outage (503) keeps it for the next try.
      if (err instanceof UnauthorizedError) clearRefreshCookie(res);
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    const currentToken = readRefreshCookie(req);
    // The browser forgets the cookie even if revoking it below fails.
    clearRefreshCookie(res);
    try {
      if (currentToken) await userService.logout(currentToken);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  static async checkStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const accessToken = req.headers.authorization?.split(" ")[1] ?? '';
      return res.status(200).json(userService.getSession(req.user!, accessToken));
    } catch (err) {
      next(err);
    }
  }
}
