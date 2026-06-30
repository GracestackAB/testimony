import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/admin";

export const dynamic = "force-dynamic";

// POST: skapa tråd. Body: { category_id, title, body }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let payload: { category_id?: string; title?: string; body?: string } = {};
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const title = (payload.title ?? "").trim();
  const body = (payload.body ?? "").trim();
  if (!payload.category_id) return NextResponse.json({ error: "missing_category" }, { status: 400 });
  if (title.length < 3 || title.length > 200) return NextResponse.json({ error: "invalid_title" }, { status: 400 });
  if (!body || body.length > 10000) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  // Verify category
  const { data: cat } = await supabase
    .from("forum_categories")
    .select("id, is_archived")
    .eq("id", payload.category_id)
    .maybeSingle();
  if (!cat || cat.is_archived) return NextResponse.json({ error: "invalid_category" }, { status: 400 });

  // Generate unique slug
  const baseSlug = slugify(title) || "trad";
  let slug = baseSlug;
  for (let i = 0; i < 10; i++) {
    const { data: existing } = await supabase
      .from("forum_threads")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data, error } = await supabase
    .from("forum_threads")
    .insert({
      slug,
      category_id: payload.category_id,
      author_id: user.id,
      title,
      body,
      status: "published",
      last_reply_at: new Date().toISOString(),
    })
    .select("id, slug, category_id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ thread: data });
}
