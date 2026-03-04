export interface ApiError {
  error: string;
  fieldErrors?: Record<string, string[]>;
}

export interface PaginatedResult<T> {
  data: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}