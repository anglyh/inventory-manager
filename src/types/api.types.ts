// types/api.types.ts
export interface PaginatedResult<T> {
  data: T[];
  totalItems: number;
  totalPages: number;
}

// El envoltorio base que siempre llega
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

// Los tipos de error según su código
export type ApiError =
  | BaseApiError
  | ValidationApiError;

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR'
  | 'INVALID_JSON'
  | 'DB_ERROR'
  | 'VALIDATION_ERROR';

interface BaseApiError {
  code: ErrorCode;
  message: string;
  field?: string;
}

interface ValidationApiError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: ValidationFieldError[];
}

export interface ValidationFieldError {
  field: string;
  message: string;
}