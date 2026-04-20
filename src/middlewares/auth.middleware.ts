import type { NextFunction, Request, Response } from 'express';
import JWT from '../lib/jwt.js';
import UserRepository from '../repositories/user.repository.js';
import { BadRequestError, UnauthorizedError } from '../errors/app.error.js';

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new BadRequestError("Token no proporcionado");

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) throw new BadRequestError("Formato de autorización inválido");

    let payload;

    try {
      payload = JWT.verifyAccessToken(token);
    } catch {
      throw new BadRequestError("Token inválido o expirado");
    }

    const userRepo = new UserRepository();
    const userExists = await userRepo.findById(payload.userId)
    if (!userExists) throw new UnauthorizedError("No autorizado");
    req.user = payload
    next()
  } catch (err) {
    next(err)
  }
}