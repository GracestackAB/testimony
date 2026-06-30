import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/admin";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["psalm", "sang", "lovsang", "eget", "annat"]);

// POST: skapa ny lovsång (status = pending för moderation)
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    title?: string;
    artist?: string;
    song_type?: string;
    youtube_url?: string;
    spotify_url?: string;
    lyrics?: string;
    bible_refs?: string[];
    description?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  if (!title || title.length > 200) return NextResponse.json({ error: "invalid_title" }, { status: 400 });
  const songType = body.song_type && ALLOWED_TYPES.has(body.song_type) ? body.song_type : "lovsang";

  // Generera unik slug
  const baseSlug = slugify(title) || "lovsang";
  let slug = baseSlug;
  for (let i = 0; i < 10; i++) {
    const { data: existing } = await supabase
      .from("worship_songs")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // Modererad publicering: är användaren moderator? Om ja → publish direkt.
  const { data: prof } = await supabase
    .from("profiles")
    .select("is_moderator")
    .eq("id", user.id)
    .maybeSingle();
  const autoPublish = Boolean(prof?.is_moderator);

  const { data, error } = await supabase
    .from("worship_songs")
    .insert({
      slug,
      title,
      artist: body.artist?.trim() || null,
      song_type: songType,
      youtube_url: body.youtube_url?.trim() || null,
      spotify_url: body.spotify_url?.trim() || null,
      lyrics: body.lyrics?.trim() || null,
      bible_refs: Array.isArray(body.bible_refs)
        ? body.bible_refs.map((s) => s.trim()).filter(Boolean).slice(0, 10)
        : null,
      description: body.description?.trim() || null,
      author_id: user.id,
      status: autoPublish ? "published" : "pending",
      published_at: autoPublish ? new Date().toISOString() : null,
    })
    .select("id, slug, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ song: data });
}
