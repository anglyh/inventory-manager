import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validateParams<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.params = schema.parse(req.params) as typeof req.params;
    next();
  };
}

/**
 * Valida `req.query` con Zod sin reasignar `req.query` (en Express 5 es de solo lectura).
 * Lee el resultado en `req.validatedQuery` dentro del handler siguiente.
 */
export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as Request & { validatedQuery: T }).validatedQuery = schema.parse(req.query);
    next();
  };
}
