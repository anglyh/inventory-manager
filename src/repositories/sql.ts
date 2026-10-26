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
