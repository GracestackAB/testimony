import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/ai/client";
import { checkHourlyRateLimit, STORY_GAME_HOURLY_LIMIT } from "@/lib/ai/rate-limit";
import { advanceStory, type StoryHistoryEntry } from "@/lib/games/story-adventure";
import { isStoryScenarioId } from "@/lib/games/story-scenarios";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_HISTORY = 16;

export async function POST(req: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI story game is not configured yet." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required to play." }, { status: 401 });
  }

  const rate = await checkHourlyRateLimit(
    user.id,
    "game_story_turns",
    STORY_GAME_HOURLY_LIMIT
  );
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit reached (${rate.limit} turns per hour). Try again later.`,
        rateLimit: rate,
      },
      { status: 429 }
    );
  }

  let body: {
    scenarioId?: string;
    choice?: string;
    history?: StoryHistoryEntry[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scenarioId = body.scenarioId?.trim();
  if (!scenarioId || !isStoryScenarioId(scenarioId)) {
    return NextResponse.json({ error: "Invalid scenario" }, { status: 400 });
  }

  const choice = body.choice?.trim();
  if (!choice || choice.length < 2) {
    return NextResponse.json({ error: "Choice too short" }, { status: 400 });
  }
  if (choice.length > 200) {
    return NextResponse.json({ error: "Choice too long" }, { status: 400 });
  }

  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (h): h is StoryHistoryEntry =>
            Boolean(h) &&
            (h.role === "user" || h.role === "assistant") &&
            typeof h.text === "string"
        )
        .slice(-MAX_HISTORY)
    : [];

  try {
    const locale = await getLocale();
    const turn = await advanceStory({ scenarioId, locale, choice, history });

    const svc = await createServiceClient();
    try {
      await svc.from("game_story_turns").insert({
        user_id: user.id,
        scenario_id: scenarioId,
      });
    } catch {
      // Rate-limit table may not be migrated yet — game still works
    }

    return NextResponse.json({
      turn,
      rateLimit: { remaining: rate.remaining - 1, limit: rate.limit },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not continue the story.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
