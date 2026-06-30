import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = { id: string };

// GET: hämta kommentarer för en bibeltext
export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: comments } = await supabase
    .from("bible_comments")
    .select("id, daily_bible_id, author_id, body, created_at, updated_at")
    .eq("daily_bible_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(500);

  if (!comments || comments.length === 0) {
    return NextResponse.json({ comments: [] });
  }

  const authorIds = Array.from(new Set(comments.map((c) => c.author_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", authorIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return NextResponse.json({
    comments: comments.map((c) => ({
      ...c,
      author: profileMap.get(c.author_id) ?? null,
    })),
  });
}

// POST: skicka en kommentar. Body: { body: string }
export async function POST(
  req: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let payload: { body?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const body = (payload.body ?? "").trim();
  if (!body) return NextResponse.json({ error: "empty_body" }, { status: 400 });
  if (body.length > 2000) return NextResponse.json({ error: "too_long" }, { status: 400 });

  // Verifiera att bibeltexten finns
  const { data: bible } = await supabase
    .from("daily_bible")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!bible) return NextResponse.json({ error: "bible_not_found" }, { status: 404 });

  const { data, error } = await supabase
    .from("bible_comments")
    .insert({ daily_bible_id: id, author_id: user.id, body })
    .select("id, daily_bible_id, author_id, body, created_at, updated_at")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ comment: { ...data, author: profile ?? null } });
}
