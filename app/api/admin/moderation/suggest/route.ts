import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/ai/client";
import {
  suggestModerationDecision,
  type ModerationContentKind,
} from "@/lib/ai/moderation-assist";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const KINDS: ModerationContentKind[] = [
  "testimony",
  "prayer_request",
  "prayer_answer",
  "gratitude",
];

export async function POST(req: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI-moderation är inte konfigurerad." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_moderator")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_moderator) {
    return NextResponse.json({ error: "Endast moderatorer." }, { status: 403 });
  }

  let body: {
    kind?: string;
    title?: string;
    lede?: string;
    content?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const kind = body.kind as ModerationContentKind;
  const content = body.content?.trim();
  if (!KINDS.includes(kind) || !content) {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  try {
    const suggestion = await suggestModerationDecision({
      kind,
      title: body.title,
      lede: body.lede,
      body: content.slice(0, 8000),
    });
    return NextResponse.json(suggestion);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI-förslag misslyckades.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
