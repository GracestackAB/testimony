import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  createChallenge,
  declineChallenge,
  getChallenge,
  listChallenges,
  notifyChallenge,
  submitChallengerScore,
} from "@/lib/games/bible-quiz-db";
import { QUIZ_TOTAL_QUESTIONS } from "@/lib/games/bible-quiz-social";
import { isLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  try {
    if (id) {
      const challenge = await getChallenge(id, user.id);
      if (!challenge) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ challenge });
    }
    const challenges = await listChallenges(user.id);
    return NextResponse.json({ challenges });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  let body: {
    challengedUserId?: string;
    username?: string;
    locale?: string;
    challengerScore?: number;
    playFirst?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const locale = body.locale ?? "sv";
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const playFirst = body.playFirst === true;
  const challengerScore = body.challengerScore;

  if (!playFirst) {
    if (
      challengerScore === undefined ||
      !Number.isInteger(challengerScore) ||
      challengerScore < 0 ||
      challengerScore > QUIZ_TOTAL_QUESTIONS
    ) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }
  }

  let challengedId = body.challengedUserId?.trim();
  if (!challengedId && body.username?.trim()) {
    const svc = await createServiceClient();
    const { data } = await svc
      .from("profiles")
      .select("id")
      .eq("username", body.username.trim().toLowerCase())
      .maybeSingle();
    challengedId = data?.id;
  }

  if (!challengedId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (challengedId === user.id) {
    return NextResponse.json({ error: "Cannot challenge yourself" }, { status: 400 });
  }

  try {
    const { id } = await createChallenge({
      challengerId: user.id,
      challengedId,
      locale,
      challengerScore: playFirst ? null : challengerScore,
    });

    if (!playFirst && challengerScore !== undefined) {
      await notifyChallenge({
        challengeId: id,
        challengerId: user.id,
        challengedId,
        challengerScore,
        total: QUIZ_TOTAL_QUESTIONS,
        locale,
      });
    }

    return NextResponse.json({ id, playFirst });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not create challenge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  let body: { challengeId?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const challengeId = body.challengeId?.trim();
  if (!challengeId) {
    return NextResponse.json({ error: "Missing challengeId" }, { status: 400 });
  }

  try {
    if (body.action === "decline") {
      await declineChallenge({ challengeId, userId: user.id });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not update challenge";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
