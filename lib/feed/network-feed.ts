import "server-only";
import { createClient } from "@/lib/supabase/server";

export type NetworkFeedItem = {
  kind: "testimony" | "prayer_answer" | "prayer_request" | "gratitude";
  id: string;
  title: string;
  body: string;
  href: string;
  publishedAt: string;
  authorName: string;
  authorUsername: string | null;
};

function truncate(s: string | null, n = 220): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n).trim() + "…" : s;
}

/** Inlägg från profiler användaren följer, sorterade nyast först. */
export async function getNetworkFeed(
  userId: string,
  limit = 30,
  since?: string
): Promise<{ items: NetworkFeedItem[]; followingCount: number }> {
  const supabase = await createClient();

  const { data: follows } = await supabase
    .from("profile_follows")
    .select("following_id")
    .eq("follower_id", userId);

  const authorIds = (follows ?? []).map((f) => f.following_id as string);
  if (authorIds.length === 0) {
    return { items: [], followingCount: 0 };
  }

  const { data: authors } = await supabase
    .from("public_profiles")
    .select("id, display_name, username")
    .in("id", authorIds);

  const authorMap = new Map(
    (authors ?? []).map((a) => [
      a.id as string,
      { name: (a.display_name as string) || "User", username: a.username as string | null },
    ])
  );

  const perType = Math.ceil(limit / 4);

  const [testimonies, answers, requests, gratitudes] = await Promise.all([
    supabase
      .from("testimonies")
      .select("id, slug, title, lede, published_at, author_id")
      .in("author_id", authorIds)
      .eq("status", "published")
      .eq("is_anonymous", false)
      .order("published_at", { ascending: false })
      .limit(perType),
    supabase
      .from("prayer_answers")
      .select("id, body, published_at, author_id")
      .in("author_id", authorIds)
      .eq("status", "published")
      .eq("is_anonymous", false)
      .order("published_at", { ascending: false })
      .limit(perType),
    supabase
      .from("prayer_requests")
      .select("id, title, body, created_at, author_id")
      .in("author_id", authorIds)
      .eq("status", "published")
      .eq("is_anonymous", false)
      .order("created_at", { ascending: false })
      .limit(perType),
    supabase
      .from("gratitudes")
      .select("id, body, published_at, author_id")
      .in("author_id", authorIds)
      .eq("status", "published")
      .eq("is_anonymous", false)
      .order("published_at", { ascending: false })
      .limit(perType),
  ]);

  const items: NetworkFeedItem[] = [];

  for (const t of testimonies.data ?? []) {
    const a = authorMap.get(t.author_id as string);
    if (!t.published_at) continue;
    items.push({
      kind: "testimony",
      id: t.id as string,
      title: t.title as string,
      body: truncate(t.lede as string | null, 220),
      href: `/vittnesbord/${t.slug}`,
      publishedAt: t.published_at as string,
      authorName: a?.name ?? "—",
      authorUsername: a?.username ?? null,
    });
  }

  for (const a of answers.data ?? []) {
    const au = authorMap.get(a.author_id as string);
    if (!a.published_at) continue;
    items.push({
      kind: "prayer_answer",
      id: a.id as string,
      title: au?.name ?? "—",
      body: truncate(a.body as string, 220),
      href: "/bonesvar",
      publishedAt: a.published_at as string,
      authorName: au?.name ?? "—",
      authorUsername: au?.username ?? null,
    });
  }

  for (const r of requests.data ?? []) {
    const au = authorMap.get(r.author_id as string);
    items.push({
      kind: "prayer_request",
      id: r.id as string,
      title: (r.title as string) || au?.name || "—",
      body: truncate(r.body as string, 220),
      href: "/boneamnen",
      publishedAt: r.created_at as string,
      authorName: au?.name ?? "—",
      authorUsername: au?.username ?? null,
    });
  }

  for (const g of gratitudes.data ?? []) {
    const au = authorMap.get(g.author_id as string);
    if (!g.published_at) continue;
    items.push({
      kind: "gratitude",
      id: g.id as string,
      title: au?.name ?? "—",
      body: truncate(g.body as string, 220),
      href: "/tack",
      publishedAt: g.published_at as string,
      authorName: au?.name ?? "—",
      authorUsername: au?.username ?? null,
    });
  }

  items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const sinceMs = since ? new Date(since).getTime() : null;
  const filtered =
    sinceMs != null
      ? items.filter((i) => new Date(i.publishedAt).getTime() >= sinceMs)
      : items;

  return { items: filtered.slice(0, limit), followingCount: authorIds.length };
}
