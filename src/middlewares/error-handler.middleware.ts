import { type NextFunction, type Request, type Response } from 'express';
import { AppError, ValidationError } from '../errors/app.error.js';
import { ZodError } from 'zod';
import type { ApiErrorResponse } from '../types/api.types.js';
import PG from 'pg';
// Every validation error this handler returns is worded by Zod in plain Spanish (applied once on import).
import '../lib/zod-locale.js';

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
    if (err.code === '23503' && err.constraint?.includes('store_id')) {
      const response: ApiErrorResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No autorizado' }
      };
      return res.status(401).json(response);
    }
    if (err.code === '23503') {
      return res.status(409).json({ success: false, error: {
        code: 'CONFLICT',
        message: err.constraint?.includes('supplier')
          ? 'El proveedor está asociado a compras o ya no está disponible'
          : 'El registro está asociado a otras operaciones o ya no está disponible',
      } });
    }
    if (err.code === '23514' && err.message.startsWith('Stock insuficiente')) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: err.message } });
    }
    if (err.code === '23514' && err.message.startsWith('No se puede anular')) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: err.message } });
    }
    if (['23514', '22P02', '22003', '22007', '22008'].includes(err.code ?? '')) {
      return res.status(422).json({ success: false, error: {
        code: 'VALIDATION_ERROR', message: 'Datos inválidos',
        fields: [{ field: '_root', message: 'Revise los identificadores, fechas, cantidades e importes enviados' }],
      } });
    }
    if (['40001', '40P01', '55P03'].includes(err.code ?? '')) {
      return res.status(409).json({ success: false, error: {
        code: 'CONFLICT', message: 'Otra operación modificó estos datos. Actualice la información antes de volver a intentar',
      } });
    }
    if (err.code === 'P0001') {
      const response: ApiErrorResponse = {
        success: false,
        error: { code: 'DB_ERROR', message: err.message }
      };
      return res.status(400).json(response);
    }
  }

  const errorCode = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
  if (errorCode.startsWith('08') || ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', '57P01', '57P03'].includes(errorCode)) {
    return res.status(503).json({ success: false, error: { code: 'DB_ERROR', message: 'Base de datos no disponible' } });
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
