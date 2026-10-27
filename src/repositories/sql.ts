/** ISO-8601 UTC text for a timestamptz expression, matching the format used across the API. */
export const isoTimestamp = (expression: string) =>
  `to_char(${expression} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

/**
 * Builds `SET col = $n, ...` for the defined keys of a partial update.
 * `columns` maps DTO keys to column names; parameters start after `offset` placeholders.
 */
export function buildSet(
  data: Record<string, unknown>,
  columns: Record<string, string>,
  offset: number,
): { set: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  for (const [key, column] of Object.entries(columns)) {
    if (data[key] === undefined) continue;
    params.push(data[key]);
    parts.push(`${column} = $${offset + params.length}`);
  }
  return { set: parts.join(', '), params };
}

/** Documentos de extranjeros: su estadía se reporta a Migraciones. */
export const FOREIGN_DOCUMENTS = `('CE', 'PASSPORT', 'PTP')`;

/** La estadía `stay` (alias SQL) tiene al menos un huésped extranjero, según la copia del ingreso. */
export const hasForeignGuest = (stay = 'st') => `EXISTS (
    SELECT 1
    FROM stay_guest AS sg
    WHERE sg.stay_id = ${stay}.id AND sg.document_type IN ${FOREIGN_DOCUMENTS}
  )`;

/** Estadía con extranjeros que todavía no se reportó a Migraciones. */
export const pendingMigrations = (stay = 'st') =>
  `${stay}.migrations_reported_at IS NULL AND ${hasForeignGuest(stay)}`;
