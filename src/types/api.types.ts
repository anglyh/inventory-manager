export interface ApiError {
  error: string;
  fieldErrors?: Record<string, string[]>;
}

export interface PaginatedResult<T> { // Response for client
  data: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface PaginatedData<T> { // Type for repository
  data: T[];
  totalItems: number;
}