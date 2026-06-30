import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPublicProfileByUsername } from "@/lib/profile/server";

export async function GET(_req: Request, ctx: { params: Promise<{ username: string }> }) {
  const { username } = await ctx.params;
  const profile = await getPublicProfileByUsername(username);
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Counts of public contributions
  const supabase = await createClient();
  const [t, pr, pa, g] = await Promise.all([
    supabase.from("testimonies").select("id", { count: "exact", head: true })
      .eq("author_id", profile.id).eq("status", "published").eq("is_anonymous", false),
    supabase.from("prayer_requests").select("id", { count: "exact", head: true })
      .eq("author_id", profile.id).eq("status", "published").eq("is_anonymous", false),
    supabase.from("prayer_answers").select("id", { count: "exact", head: true })
      .eq("author_id", profile.id).eq("status", "published").eq("is_anonymous", false),
    supabase.from("gratitudes").select("id", { count: "exact", head: true })
      .eq("author_id", profile.id).eq("status", "published").eq("is_anonymous", false),
  ]);

  return NextResponse.json({
    ...profile,
    stats: {
      testimonies: t.count ?? 0,
      prayer_requests: pr.count ?? 0,
      prayer_answers: pa.count ?? 0,
      gratitudes: g.count ?? 0,
    },
  });
}
