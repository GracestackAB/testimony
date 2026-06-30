import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["heart", "amen", "hallelujah", "praying"]);

type Params = { id: string };

// GET: hämta reaktionsräknare + om jag har reagerat
export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: counts } = await supabase.rpc("get_reaction_counts", {
    p_kind: "daily_bible",
    p_id: id,
  });

  let mine: string[] = [];
  if (user) {
    const { data } = await supabase
      .from("reactions")
      .select("kind")
      .eq("content_kind", "daily_bible")
      .eq("content_id", id)
      .eq("user_id", user.id);
    mine = (data ?? []).map((r) => r.kind);
  }

  return NextResponse.json({
    counts: (counts as Record<string, number>) ?? {},
    mine,
  });
}

// POST: toggla reaktion. Body: { kind: "heart"|"amen"|"hallelujah"|"praying" }
export async function POST(
  req: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let payload: { kind?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const kind = payload.kind ?? "";
  if (!ALLOWED.has(kind)) {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }

  // Kontrollera om reaktionen finns redan → ta bort, annars lägg till
  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("content_kind", "daily_bible")
    .eq("content_id", id)
    .eq("user_id", user.id)
    .eq("kind", kind)
    .maybeSingle();

  if (existing) {
    await supabase.from("reactions").delete().eq("id", existing.id);
    return NextResponse.json({ active: false, kind });
  }

  const { error } = await supabase.from("reactions").insert({
    content_kind: "daily_bible",
    content_id: id,
    user_id: user.id,
    kind,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ active: true, kind });
}
