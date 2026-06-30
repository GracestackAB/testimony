import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/ai/client";
import { assistWriting, type WriteAssistKind } from "@/lib/ai/writing-assist";
import { WRITE_AI_HOURLY_LIMIT, checkHourlyRateLimit } from "@/lib/ai/rate-limit";
import type { Locale } from "@/lib/i18n/types";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const KINDS: WriteAssistKind[] = ["testimony", "prayer_request", "prayer_answer", "gratitude"];

export async function POST(req: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI-skrivhjälp är inte aktiverad ännu." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Logga in för att använda skrivhjälp." }, { status: 401 });
  }

  const rate = await checkHourlyRateLimit(user.id, "ai_write_assists", WRITE_AI_HOURLY_LIMIT);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Gräns nådd (${rate.limit} förfrågningar per timme).` },
      { status: 429 }
    );
  }

  let body: { kind?: string; locale?: string; seed?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const kind = body.kind as WriteAssistKind;
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: "Ogiltig typ." }, { status: 400 });
  }

  const locale: Locale = body.locale === "en" ? "en" : "sv";
  const seed = body.seed?.trim().slice(0, 400);

  try {
    const result = await assistWriting({ kind, locale, seed });

    const svc = await createServiceClient();
    await svc.from("ai_write_assists").insert({ user_id: user.id, kind });

    return NextResponse.json({ ...result, rateLimit: { remaining: rate.remaining - 1, limit: rate.limit } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kunde inte generera förslag.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
