import { type NextFunction, type Request, type Response } from 'express';
import { AppError, ValidationError } from '../errors/app.error.js';
import { ZodError } from 'zod';
import type { ApiErrorResponse } from '../types/api.types.js';
import PG from 'pg';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);

  if (err instanceof SyntaxError && 'body' in err) {
    const response: ApiErrorResponse = {
      success: false,
      error: { code: 'INVALID_JSON', message: 'JSON inválido en el cuerpo de la solicitud' }
    }
    return res.status(400).json(response);
  }

  if (err instanceof ValidationError) {
    const response: ApiErrorResponse = {
      success: false,
      error: { 
        code: 'VALIDATION_ERROR',
        message: err.message,
        fields: err.fields
      }
    }
    return res.status(err.statusCode).json(response);
  }

  if (err instanceof ZodError) {
    const response: ApiErrorResponse = { 
      success: false,
      error: { 
        code: 'VALIDATION_ERROR',
        message: 'Error de validación',
        fields: err.issues.map(issue => ({
          field: issue.path.join('.') || '_root',
          message: issue.message
        }))
      } 
    }
    return res.status(422).json(response);
  }

  if (err instanceof AppError) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.field ? { field: err.field } : {})
      }
    }
    return res.status(err.statusCode).json(response)
  }

  if (err instanceof PG.DatabaseError) {
    if (err.code === '23505') {
      const response: ApiErrorResponse = {
        success: false,
        error: { code: 'CONFLICT', message: 'El registro ya existe' }
      };
      return res.status(409).json(response);
    }
    if (err.code === '23503' && err.constraint?.includes('user_id')) {
      const response: ApiErrorResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No autorizado' }
      };
      return res.status(401).json(response);
    }
    if (err.code === 'P0001') {
      const response: ApiErrorResponse = {
        success: false,
        error: { code: 'DB_ERROR', message: err.message }
      };
      return res.status(400).json(response);
    }
  }

  const response: ApiErrorResponse = {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
  };
  return res.status(500).json(response)
}

export function notFoundHandler(req: Request, res: Response) {
  const response: ApiErrorResponse = {
    success: false,
    error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' }
  };
  res.status(404).json(response);
}