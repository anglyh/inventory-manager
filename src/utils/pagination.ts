import type { PaginatedResult } from "../types/api.types.js";

export function buildPaginateResult<T>(
  data: T[],
  totalItems: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  return {
    data,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
    currentPage: page
  }
}