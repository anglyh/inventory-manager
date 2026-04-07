import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app.error.js';
import { ZodError } from 'zod';
import type { ApiError } from '../types/api.types.js';
import PG from 'pg';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'JSON inválido en el cuerpo de la solicitud' })
  }

  if (err instanceof AppError) {
    const response: ApiError = { error: err.message }
    return res.status(err.statusCode).json(response)
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const field = issue.path.join('.') || '_root';
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(issue.message);
    }

    return res.status(400).json({ error: "Error de validación", fieldErrors })
  }


  if (err instanceof PG.DatabaseError) {
    console.error("DB error", err.code)
    if (err.code === "23505") {
      return res.status(409).json({ error: "El registro ya existe" });
    } 
    if (err.code === "P0001") {
      return res.status(400).json({ error: err.message })
    }

    if (err.code === "23503" && err.constraint?.includes("user_id")) {
      return res.status(401).json({ error: "No autorizado" })
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