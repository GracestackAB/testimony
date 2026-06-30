import { createServiceClient } from "@/lib/supabase/server";
import { normalizeForDate } from "@/lib/bible/dates";

export type PendingDailyBibleRow = {
  id: string;
  for_date: string;
  reference: string;
  text_body: string;
  explanation: string | null;
  status: string;
};

type NotifRow = { id: string; metadata: { bible_id?: string } };

/** Alla bibeltexter med status pending, äldst först (godkänn i ordning). */
export async function getPendingDailyBibleRows(): Promise<PendingDailyBibleRow[]> {
  const svc = await createServiceClient();
  const { data, error } = await svc
    .from("daily_bible")
    .select("id, for_date, reference, text_body, explanation, status")
    .eq("status", "pending")
    .order("for_date", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: PendingDailyBibleRow & { for_date: unknown }) => ({
    ...row,
    for_date: normalizeForDate(row.for_date),
  })) as PendingDailyBibleRow[];
}

/**
 * Markerar in-app-notiser som lästa när bibeltext redan är granskad.
 */
export async function reconcileStaleBibleReviewNotifications(): Promise<number> {
  const svc = await createServiceClient();
  const { data: pendingRows } = await svc
    .from("daily_bible")
    .select("id")
    .eq("status", "pending");

  const pendingIds = new Set((pendingRows ?? []).map((r: { id: string }) => r.id));

  const { data: notifs } = await svc
    .from("notifications")
    .select("id, metadata")
    .eq("type", "daily_bible_pending")
    .is("read_at", null);

  if (!notifs?.length) return 0;

  const staleIds = (notifs as NotifRow[])
    .filter((n) => {
      const bibleId = n.metadata?.bible_id;
      return bibleId && !pendingIds.has(bibleId);
    })
    .map((n) => n.id);

  if (staleIds.length === 0) return 0;

  const { error } = await svc
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", staleIds);

  if (error) {
    console.error("[bible-notify] reconcile failed:", error.message);
    return 0;
  }

  return staleIds.length;
}

export async function markBibleReviewNotificationsDone(bibleId: string): Promise<void> {
  const svc = await createServiceClient();
  const { data: notifs } = await svc
    .from("notifications")
    .select("id, metadata")
    .eq("type", "daily_bible_pending")
    .is("read_at", null);

  const ids = (notifs as NotifRow[])
    .filter((n) => n.metadata?.bible_id === bibleId)
    .map((n) => n.id);

  if (!ids.length) return;

  await svc
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids);
}
