import { createServiceClient } from "@/lib/supabase/server";
import { markBibleReviewNotificationsDone } from "@/lib/bible/admin-notifications";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CONTENT_STATUSES = ["draft", "pending", "published", "rejected", "archived"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** Säkerställ giltig content_status — UUID eller skräp blir inte skickat till PG. */
export function coerceContentStatus(value: string | null | undefined, fallback: ContentStatus = "published"): ContentStatus {
  const v = (value ?? "").trim();
  if ((CONTENT_STATUSES as readonly string[]).includes(v)) return v as ContentStatus;
  return fallback;
}

export function bibleIdFromForm(formData: FormData): string | null {
  const raw = String(formData.get("bible_id") ?? formData.get("id") ?? formData.get("__id") ?? "").trim();
  return isUuid(raw) ? raw : null;
}

export type DailyBibleAdminPayload = {
  for_date: string;
  reference: string;
  text_body: string;
  explanation: string | null;
  status: ContentStatus;
};

export function dailyBiblePayloadFromForm(formData: FormData): DailyBibleAdminPayload {
  return {
    for_date: String(formData.get("for_date") ?? "").slice(0, 10),
    reference: String(formData.get("reference") ?? "").trim(),
    text_body: String(formData.get("text_body") ?? "").trim(),
    explanation: String(formData.get("explanation") ?? "").trim() || null,
    status: coerceContentStatus(String(formData.get("status") ?? ""), "published"),
  };
}

/** Godkänn och publicera en dagens bibeltext. */
export async function approveDailyBibleById(bibleId: string): Promise<void> {
  if (!isUuid(bibleId)) {
    throw new Error("Ogiltigt bibeltext-ID");
  }

  const svc = await createServiceClient();
  const { error } = await svc.from("daily_bible").update({ status: "published" }).eq("id", bibleId);
  if (error) throw new Error(error.message);

  await markBibleReviewNotificationsDone(bibleId);
}

export async function updateDailyBibleById(bibleId: string, payload: DailyBibleAdminPayload): Promise<void> {
  if (!isUuid(bibleId)) {
    throw new Error("Ogiltigt bibeltext-ID");
  }
  if (!payload.for_date || !payload.reference || !payload.text_body) {
    throw new Error("Datum, referens och bibeltext krävs");
  }

  const svc = await createServiceClient();
  const { error } = await svc.from("daily_bible").update(payload).eq("id", bibleId);
  if (error) throw new Error(error.message);
}

export async function deleteDailyBibleById(bibleId: string): Promise<void> {
  if (!isUuid(bibleId)) {
    throw new Error("Ogiltigt bibeltext-ID");
  }
  const svc = await createServiceClient();
  const { error } = await svc.from("daily_bible").delete().eq("id", bibleId);
  if (error) throw new Error(error.message);
}
