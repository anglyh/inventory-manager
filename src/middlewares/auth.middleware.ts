import type { NextFunction, Request, Response } from 'express';
import JWT from '../lib/jwt.js';
import UserRepository from '../repositories/user.repository.js';
import { ForbiddenError, UnauthorizedError } from '../errors/app.error.js';

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new UnauthorizedError("Token no proporcionado");

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) throw new UnauthorizedError("Formato de autorización inválido");

    let payload;

    try {
      payload = JWT.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError("Token inválido o expirado");
    }

    const userRepo = new UserRepository();
    const userExists = await userRepo.findById(payload.userId)
    // A deactivated user loses access on the next request, even with an unexpired token.
    if (!userExists || !userExists.active) throw new UnauthorizedError("No autorizado");
    req.user = { ...payload, storeId: userExists.storeId, role: userExists.role, name: userExists.name, email: userExists.email };
    next()
  } catch (err) {
    next(err)
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (req.user?.role !== 'ADMIN') {
      return next(new ForbiddenError('Acceso denegado. Se requiere ser Administrador'))
    }
    next();
  } catch (err) {
    next(err)
  }
}
