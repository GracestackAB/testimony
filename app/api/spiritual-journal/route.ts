import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSpiritualJournalCategory, type CreateJournalEntryInput } from "@/lib/spiritual-journal/types";

export const dynamic = "force-dynamic";

function parseCreateBody(body: unknown): CreateJournalEntryInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.body !== "string" || !b.body.trim()) return null;
  if (typeof b.category !== "string" || !isSpiritualJournalCategory(b.category)) return null;

  return {
    category: b.category,
    body: b.body.trim(),
    title: typeof b.title === "string" ? b.title.trim() || null : null,
    scripture_ref: typeof b.scripture_ref === "string" ? b.scripture_ref.trim() || null : null,
    entry_date: typeof b.entry_date === "string" ? b.entry_date : undefined,
    is_pinned: b.is_pinned === true,
    metadata: b.metadata && typeof b.metadata === "object" ? (b.metadata as Record<string, unknown>) : {},
  };
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const category = url.searchParams.get("category");

  let query = supabase
    .from("spiritual_journal_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("is_pinned", { ascending: false })
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (category && isSpiritualJournalCategory(category)) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = parseCreateBody(await req.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const row = {
    user_id: user.id,
    category: parsed.category,
    body: parsed.body,
    title: parsed.title ?? null,
    scripture_ref: parsed.scripture_ref ?? null,
    entry_date: parsed.entry_date ?? new Date().toISOString().slice(0, 10),
    is_pinned: parsed.is_pinned ?? false,
    metadata: parsed.metadata ?? {},
  };

  const { data, error } = await supabase
    .from("spiritual_journal_entries")
    .insert(row)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data }, { status: 201 });
}
