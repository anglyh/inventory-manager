import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app.error.js';
import z, { ZodError } from 'zod';
import type { ApiError } from '../types/api.types.js';
import PG from 'pg';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);

  if (err instanceof AppError) {
    console.log("error", err)
    const response: ApiError = { error: err.message }
    return res.status(err.statusCode).json(response)
  }

  if (err instanceof ZodError) {
    const response: ApiError = { error: err.message, fieldErrors: z.flattenError(err).fieldErrors }
    return res.status(400).json(response)
  }

  if (err instanceof PG.DatabaseError) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "El registro ya existe" });
    } 
    if (err.code === "P0001") {
      return res.status(400).json({ error: err.message })
    }
    return res.status(500).json({ error: err.message })
  }

  return res.status(500).json({
    error: "Internal server error"
  })
}

export function notFoundHandler(
  req: Request,
  res: Response,
) {
  res.status(404).json({
    error: "Ruta no encontrada"
  })
}