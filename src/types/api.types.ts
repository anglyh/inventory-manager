export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  fieldErrors?: Record<string, string[]>;
}