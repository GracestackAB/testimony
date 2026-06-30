import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = { slug: string };

async function threadIdBySlug(supabase: Awaited<ReturnType<typeof createClient>>, slug: string) {
  const { data } = await supabase
    .from("forum_threads")
    .select("id, is_locked, status")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const t = await threadIdBySlug(supabase, slug);
  if (!t) return NextResponse.json({ replies: [] });

  const { data: replies } = await supabase
    .from("forum_replies")
    .select("id, thread_id, author_id, body, created_at")
    .eq("thread_id", t.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(500);

  if (!replies || replies.length === 0) return NextResponse.json({ replies: [] });

  const authorIds = Array.from(new Set(replies.map((r) => r.author_id).filter(Boolean) as string[]));
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", authorIds)
    : { data: [] };
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));

  return NextResponse.json({
    replies: replies.map((r) => ({ ...r, author: r.author_id ? map.get(r.author_id) ?? null : null })),
  });
}

export async function POST(req: Request, { params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const t = await threadIdBySlug(supabase, slug);
  if (!t) return NextResponse.json({ error: "thread_not_found" }, { status: 404 });
  if (t.is_locked) return NextResponse.json({ error: "thread_locked" }, { status: 403 });
  if (t.status !== "published") return NextResponse.json({ error: "thread_not_open" }, { status: 403 });

  let payload: { body?: string } = {};
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const body = (payload.body ?? "").trim();
  if (!body || body.length > 5000) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { data, error } = await supabase
    .from("forum_replies")
    .insert({ thread_id: t.id, author_id: user.id, body })
    .select("id, thread_id, author_id, body, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ reply: { ...data, author: profile ?? null } });
}
