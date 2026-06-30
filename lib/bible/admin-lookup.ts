import { createServiceClient } from "@/lib/supabase/server";
import { isIsoDateKey, normalizeForDate } from "@/lib/bible/dates";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DailyBibleAdminRow = {
  id: string;
  for_date: string;
  reference: string;
  text_body: string;
  explanation: string | null;
  status: string;
};

/**
 * Hämtar bibeltext för admin via UUID eller datum (YYYY-MM-DD).
 */
export async function getDailyBibleForAdmin(key: string): Promise<DailyBibleAdminRow | null> {
  const svc = await createServiceClient();
  const trimmed = String(key).trim();

  let query = svc.from("daily_bible").select("id, for_date, reference, text_body, explanation, status");

  if (UUID_RE.test(trimmed)) {
    query = query.eq("id", trimmed);
  } else if (isIsoDateKey(trimmed)) {
    query = query.eq("for_date", trimmed);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  return {
    ...data,
    for_date: normalizeForDate(data.for_date),
  } as DailyBibleAdminRow;
}

export function isDailyBibleAdminKey(key: string): boolean {
  const t = String(key).trim();
  return UUID_RE.test(t) || isIsoDateKey(t);
}
