

export interface ApiError {
  error: string;
  fieldErrors?: Record<string, string[]>;
}