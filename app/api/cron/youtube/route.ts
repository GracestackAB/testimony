import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchLatestVideos } from "@/lib/youtube";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Vercel Cron: körs var 30:e minut.
 * Hämtar senaste videorna för varje organisation med youtube_channel_id
 * och cachar i organizations.latest_videos (JSONB).
 *
 * Skyddas av CRON_SECRET (sätts i Vercel env vars). Vercel skickar
 * "Authorization: Bearer ${CRON_SECRET}" automatiskt om secret finns.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const svc = await createServiceClient();
  const { data: orgs, error } = await svc
    .from("organizations")
    .select("id, slug, youtube_channel_id")
    .not("youtube_channel_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ slug: string; videos: number; error?: string }> = [];

  for (const org of orgs || []) {
    if (!org.youtube_channel_id) continue;
    try {
      const videos = await fetchLatestVideos(org.youtube_channel_id, 5);
      await svc
        .from("organizations")
        .update({
          latest_videos: videos,
          latest_videos_fetched_at: new Date().toISOString(),
        })
        .eq("id", org.id);
      results.push({ slug: org.slug, videos: videos.length });
    } catch (err: any) {
      results.push({ slug: org.slug, videos: 0, error: err?.message || "unknown" });
    }
  }

  return NextResponse.json({
    ok: true,
    updated: results.length,
    results,
    ranAt: new Date().toISOString(),
  });
}
