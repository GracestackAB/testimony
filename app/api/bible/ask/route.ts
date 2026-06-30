import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { answerBibleQuestion } from "@/lib/bible/rag";
import { isAiConfigured } from "@/lib/ai/client";
import { BIBLE_AI_HOURLY_LIMIT, checkHourlyRateLimit } from "@/lib/ai/rate-limit";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_LEN = 500;

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

  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const question = body.question?.trim();
  if (!question || question.length < 3) {
    return NextResponse.json({ error: "Skriv en fråga (minst 3 tecken)." }, { status: 400 });
  }
  if (question.length > MAX_LEN) {
    return NextResponse.json({ error: `Frågan får vara högst ${MAX_LEN} tecken.` }, { status: 400 });
  }

  try {
    const locale = await getLocale();
    const result = await answerBibleQuestion(question, user.id, locale);
    return NextResponse.json({
      ...result,
      rateLimit: { remaining: rate.remaining - 1, limit: rate.limit },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kunde inte svara just nu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
