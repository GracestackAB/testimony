import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UpdateJournalEntryInput } from "@/lib/spiritual-journal/types";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

function parseUpdateBody(body: unknown): UpdateJournalEntryInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const out: UpdateJournalEntryInput = {};

  if (typeof b.body === "string") {
    if (!b.body.trim()) return null;
    out.body = b.body.trim();
  }
  if (typeof b.title === "string") out.title = b.title.trim() || null;
  if (typeof b.scripture_ref === "string") out.scripture_ref = b.scripture_ref.trim() || null;
  if (typeof b.entry_date === "string") out.entry_date = b.entry_date;
  if (typeof b.is_pinned === "boolean") out.is_pinned = b.is_pinned;
  if (b.metadata && typeof b.metadata === "object") out.metadata = b.metadata as Record<string, unknown>;

  return Object.keys(out).length > 0 ? out : null;
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = parseUpdateBody(await req.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { data, error } = await supabase
    .from("spiritual_journal_entries")
    .update({ ...parsed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ entry: data });
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { error, count } = await supabase
    .from("spiritual_journal_entries")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
