import type { CursorPage } from '../types/api.types.js';

/** El repositorio debe consultar hasta limit + 1 filas para detectar otra página. */
export function buildCursorPage<T extends { id: string }>(
  rows: T[],
  limit: number,
  getCursorDate: (row: T) => string,
): CursorPage<T> {
  const data = rows.slice(0, limit);
  const lastRow = data.at(-1);
  const hasMore = rows.length > limit;

  // Usar el texto original de PostgreSQL; convertirlo a Date perdería microsegundos.
  const nextCursor = hasMore && lastRow
    ? { cursorId: lastRow.id, cursorDate: getCursorDate(lastRow) }
    : null;

  return { data, nextCursor };
}
