import "server-only";
import { generateFeedDigest } from "@/lib/ai/feed-digest";
import { getNetworkFeed } from "@/lib/feed/network-feed";
import type { Locale } from "@/lib/i18n/types";
import { createServiceClient } from "@/lib/supabase/server";

export type WeeklyDigestRow = {
  id: string;
  user_id: string;
  week_start: string;
  summary: string;
  highlights: string[];
  prayer_focus: string | null;
  item_count: number;
  locale: string;
  created_at: string;
};

/** Måndag 00:00 UTC för aktuell vecka (ISO-datum). */
export function currentWeekStart(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function weekSinceIso(weekStart: string): string {
  return `${weekStart}T00:00:00.000Z`;
}

/**
 * Hämtar eller genererar veckosammanfattning för användarens nätverksflöde.
 */
export async function getOrCreateWeeklyDigest(
  userId: string,
  locale: Locale,
  options?: { force?: boolean }
): Promise<{
  digest: WeeklyDigestRow | null;
  followingCount: number;
  generated: boolean;
}> {
  const weekStart = currentWeekStart();
  const svc = await createServiceClient();

  if (!options?.force) {
    const { data: existing } = await svc
      .from("feed_weekly_digests")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .maybeSingle();

    if (existing) {
      const { count } = await svc
        .from("profile_follows")
        .select("following_id", { count: "exact", head: true })
        .eq("follower_id", userId);
      return {
        digest: mapRow(existing),
        followingCount: count ?? 0,
        generated: false,
      };
    }
  }

  const { items, followingCount } = await getNetworkFeed(userId, 40, weekSinceIso(weekStart));

  if (followingCount === 0) {
    return { digest: null, followingCount: 0, generated: false };
  }

  const { isAiConfigured } = await import("@/lib/ai/client");
  if (!isAiConfigured()) {
    throw new Error("AI-provider saknas (Azure OpenAI eller OpenRouter)");
  }

  const result = await generateFeedDigest(items, locale, followingCount);

  const { data: saved, error } = await svc
    .from("feed_weekly_digests")
    .upsert(
      {
        user_id: userId,
        week_start: weekStart,
        summary: result.summary,
        highlights: result.highlights,
        prayer_focus: result.prayerFocus,
        item_count: items.length,
        locale,
      },
      { onConflict: "user_id,week_start" }
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { digest: mapRow(saved), followingCount, generated: true };
}

function mapRow(row: Record<string, unknown>): WeeklyDigestRow {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    week_start: row.week_start as string,
    summary: row.summary as string,
    highlights: (row.highlights as string[]) ?? [],
    prayer_focus: (row.prayer_focus as string | null) ?? null,
    item_count: Number(row.item_count ?? 0),
    locale: row.locale as string,
    created_at: row.created_at as string,
  };
}

/**
 * Cron: skapar notiser för användare med aktivt nätverk denna vecka.
 */
export async function runWeeklyDigestCron(): Promise<{
  processed: number;
  notified: number;
  skipped: number;
}> {
  const svc = await createServiceClient();
  const weekStart = currentWeekStart();

  const { data: followers } = await svc
    .from("profile_follows")
    .select("follower_id")
    .limit(5000);

  const rows = (followers ?? []) as Array<{ follower_id: string }>;
  const userIds = [...new Set(rows.map((f) => f.follower_id))];
  let processed = 0;
  let notified = 0;
  let skipped = 0;

  for (const userId of userIds) {
    processed++;
    const { data: profile } = await svc
      .from("profiles")
      .select("preferred_locale")
      .eq("id", userId)
      .maybeSingle();

    const locale: Locale = profile?.preferred_locale === "en" ? "en" : "sv";

    const { items, followingCount } = await getNetworkFeed(userId, 40, weekSinceIso(weekStart));
    if (followingCount === 0 || items.length === 0) {
      skipped++;
      continue;
    }

    const { data: existingNotif } = await svc
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "system")
      .gte("created_at", weekSinceIso(weekStart))
      .filter("metadata->>kind", "eq", "feed_weekly_digest")
      .filter("metadata->>week_start", "eq", weekStart)
      .maybeSingle();

    if (existingNotif) {
      skipped++;
      continue;
    }

    try {
      const { digest } = await getOrCreateWeeklyDigest(userId, locale);
      if (!digest) {
        skipped++;
        continue;
      }

      const title =
        locale === "sv" ? "Din vecka i nätverket" : "Your week in the network";
      const body =
        digest.summary.length > 180 ? digest.summary.slice(0, 177) + "…" : digest.summary;

      await svc.from("notifications").insert({
        user_id: userId,
        type: "system",
        title,
        body,
        action_url: "/flode",
        metadata: { kind: "feed_weekly_digest", week_start: weekStart, item_count: digest.item_count },
      });
      notified++;
    } catch {
      skipped++;
    }
  }

  return { processed, notified, skipped };
}
