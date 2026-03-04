import type { NextFunction, Request, Response } from 'express';
import { BadRequest, Unauthorized } from '../errors/app.error.js';
import JWT from '../lib/jwt.js';
import UserRepository from '../repositories/user.repository.js';

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new BadRequest("Token no proporcionado");

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) throw new BadRequest("Formato de autorización inválido");

    let payload;

    try {
      payload = JWT.verifyAccessToken(token);
    } catch {
      throw new BadRequest("Token inválido o expirado");
    }

    const userRepo = new UserRepository();
    const userExists = await userRepo.findById(payload.userId)
    if (!userExists) throw new Unauthorized("No autorizado");
    req.user = payload
    next()
  } catch (err) {
    next(err)
  }
}