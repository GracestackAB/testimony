const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Normaliserar PG/Supabase datum till YYYY-MM-DD (aldrig "Sun Jun 28"). */
export function normalizeForDate(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") {
    if (DATE_RE.test(value)) return value;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return value.slice(0, 10);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const asString = String(value);
  if (DATE_RE.test(asString)) return asString;
  const parsed = new Date(asString);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return asString.slice(0, 10);
}

export function isIsoDateKey(key: string): boolean {
  return DATE_RE.test(key.trim());
}
