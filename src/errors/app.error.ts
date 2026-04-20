import type { ErrorCode } from '../types/api.types.js';

export class AppError extends Error {
  readonly code: ErrorCode
  readonly statusCode: number
  readonly field: string | null

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    field: string | null = null
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;

    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", field: string | null = null) {
    super("BAD_REQUEST", message, 400, field);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super("NOT_FOUND", message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super("CONFLICT", message, 409);
  }
}


interface ValidationErrorField {
  field: string;
  message: string;
}
export class ValidationError extends AppError {
  readonly fields: ValidationErrorField[]
  
  constructor(fields: ValidationErrorField[], message = "Validation Error") {
    super("VALIDATION_ERROR", message, 422)
    this.fields= fields
  }
}