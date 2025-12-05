import type { NextFunction, Request, Response } from 'express';
import { BadRequest } from '../errors/app.error.js';
import JWT from '../lib/jwt.js';

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new BadRequest("Token no proporcionado");

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) throw new BadRequest("Formato de autorización inválido");

  try {
    const user = JWT.verifyAccessToken(token);
    req.user = user;
    next();
  } catch (err) {
    throw new BadRequest("Token inválido o expirado");
  }
}