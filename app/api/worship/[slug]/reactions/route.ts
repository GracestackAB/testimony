import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["heart", "amen", "hallelujah", "praying"]);

type Params = { slug: string };

async function songIdBySlug(supabase: Awaited<ReturnType<typeof createClient>>, slug: string) {
  const { data } = await supabase.from("worship_songs").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const songId = await songIdBySlug(supabase, slug);
  if (!songId) return NextResponse.json({ counts: {}, mine: [] });

  const { data: { user } } = await supabase.auth.getUser();
  const { data: counts } = await supabase.rpc("get_reaction_counts", {
    p_kind: "worship_song",
    p_id: songId,
  });
  let mine: string[] = [];
  if (user) {
    const { data } = await supabase
      .from("reactions")
      .select("kind")
      .eq("content_kind", "worship_song")
      .eq("content_id", songId)
      .eq("user_id", user.id);
    mine = (data ?? []).map((r) => r.kind);
  }
  return NextResponse.json({ counts: (counts as Record<string, number>) ?? {}, mine });
}

export async function POST(req: Request, { params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const songId = await songIdBySlug(supabase, slug);
  if (!songId) return NextResponse.json({ error: "song_not_found" }, { status: 404 });

  let payload: { kind?: string } = {};
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const kind = payload.kind ?? "";
  if (!ALLOWED.has(kind)) return NextResponse.json({ error: "invalid_kind" }, { status: 400 });

  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("content_kind", "worship_song")
    .eq("content_id", songId)
    .eq("user_id", user.id)
    .eq("kind", kind)
    .maybeSingle();

  if (existing) {
    await supabase.from("reactions").delete().eq("id", existing.id);
    return NextResponse.json({ active: false, kind });
  }
  const { error } = await supabase.from("reactions").insert({
    content_kind: "worship_song", content_id: songId, user_id: user.id, kind,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ active: true, kind });
}
