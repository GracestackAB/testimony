import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  completeChallenge,
  recordQuizScore,
  submitChallengerScore,
} from "@/lib/games/youth-duel-db";
import { DUEL_TOTAL_QUESTIONS } from "@/lib/games/youth-duel-social";
import { isLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  let body: {
    score?: number;
    locale?: string;
    challengeId?: string;
    asChallenger?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const score = body.score;
  if (
    score === undefined ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > DUEL_TOTAL_QUESTIONS
  ) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });
  }

  const locale = body.locale ?? "sv";
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  try {
    const stats = await recordQuizScore(user.id, locale, score);

    let challengeResult = null;
    if (body.challengeId) {
      if (body.asChallenger) {
        await submitChallengerScore({
          challengeId: body.challengeId,
          userId: user.id,
          score,
        });
      } else {
        challengeResult = await completeChallenge({
          challengeId: body.challengeId,
          userId: user.id,
          challengedScore: score,
        });
      }
    }

    return NextResponse.json({ ...stats, challengeResult });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not save score";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
