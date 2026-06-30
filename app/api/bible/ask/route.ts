import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { answerBibleQuestion, type BibleHistoryTurn } from "@/lib/bible/rag";
import type { BibleAiMode } from "@/lib/bible/rag-prompts";
import { isAiConfigured } from "@/lib/ai/client";
import { BIBLE_AI_HOURLY_LIMIT, checkHourlyRateLimit } from "@/lib/ai/rate-limit";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const MAX_LEN_GUIDE = 500;
const MAX_LEN_PROFESSOR = 800;

function parseMode(raw: unknown): BibleAiMode {
  return raw === "professor" ? "professor" : "guide";
}

function parseHistory(raw: unknown): BibleHistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is BibleHistoryTurn =>
        typeof item === "object" &&
        item !== null &&
        (item as BibleHistoryTurn).role !== undefined &&
        typeof (item as BibleHistoryTurn).content === "string" &&
        ["user", "assistant"].includes((item as BibleHistoryTurn).role)
    )
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 4000),
    }))
    .slice(-8);
}

export async function POST(req: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "Bibel-AI är inte konfigurerad ännu." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Logga in för att ställa frågor." }, { status: 401 });
  }

  const rate = await checkHourlyRateLimit(user.id, "bible_ai_queries", BIBLE_AI_HOURLY_LIMIT);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Du har nått gränsen (${rate.limit} frågor per timme). Försök igen om en stund.`,
        rateLimit: rate,
      },
      { status: 429 }
    );
  }

  let body: { question?: string; mode?: string; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const mode = parseMode(body.mode);
  const maxLen = mode === "professor" ? MAX_LEN_PROFESSOR : MAX_LEN_GUIDE;
  const question = body.question?.trim();
  if (!question || question.length < 3) {
    return NextResponse.json({ error: "Skriv en fråga (minst 3 tecken)." }, { status: 400 });
  }
  if (question.length > maxLen) {
    return NextResponse.json({ error: `Frågan får vara högst ${maxLen} tecken.` }, { status: 400 });
  }

  try {
    const locale = await getLocale();
    const history = parseHistory(body.history);
    const result = await answerBibleQuestion(question, user.id, locale, mode, history);
    return NextResponse.json({
      ...result,
      rateLimit: { remaining: rate.remaining - 1, limit: rate.limit },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kunde inte svara just nu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
