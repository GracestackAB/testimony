import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/profile/search?q=text&limit=20
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1), 50);

  if (q.length < 2) {
    return NextResponse.json({ results: [], q });
  }

  const supabase = await createClient();
  // Använd public_profiles-vyn så vi följer privacy-regler
  const escaped = q.replace(/[%_,()]/g, "");
  const pattern = `%${escaped}%`;

  const { data, error } = await supabase
    .from("public_profiles")
    .select("id, username, display_name, avatar_url, headline, bio, city, church, denomination, ministry_focus, open_to_connect, open_to_serve")
    .or(
      `username.ilike.${pattern},display_name.ilike.${pattern},city.ilike.${pattern},church.ilike.${pattern},headline.ilike.${pattern},ministry_focus.ilike.${pattern}`
    )
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message, results: [] }, { status: 400 });
  }

  return NextResponse.json({ results: data ?? [], q });
}
