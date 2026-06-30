import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = { slug: string };

async function songIdBySlug(supabase: Awaited<ReturnType<typeof createClient>>, slug: string) {
  const { data } = await supabase.from("worship_songs").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const songId = await songIdBySlug(supabase, slug);
  if (!songId) return NextResponse.json({ comments: [] });

  const { data: comments } = await supabase
    .from("worship_comments")
    .select("id, song_id, author_id, body, created_at")
    .eq("song_id", songId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(500);

  if (!comments || comments.length === 0) return NextResponse.json({ comments: [] });

  const authorIds = Array.from(new Set(comments.map((c) => c.author_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", authorIds);
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return NextResponse.json({
    comments: comments.map((c) => ({ ...c, author: map.get(c.author_id) ?? null })),
  });
}

export async function POST(req: Request, { params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const songId = await songIdBySlug(supabase, slug);
  if (!songId) return NextResponse.json({ error: "song_not_found" }, { status: 404 });

  let payload: { body?: string } = {};
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const body = (payload.body ?? "").trim();
  if (!body || body.length > 2000) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { data, error } = await supabase
    .from("worship_comments")
    .insert({ song_id: songId, author_id: user.id, body })
    .select("id, song_id, author_id, body, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ comment: { ...data, author: profile ?? null } });
}
