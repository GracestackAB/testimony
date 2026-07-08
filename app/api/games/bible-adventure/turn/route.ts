import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/ai/client";
import { checkHourlyRateLimit, STORY_GAME_HOURLY_LIMIT } from "@/lib/ai/rate-limit";
import { isUsersTurn, swapCoopTurn } from "@/lib/games/bible-adventure/coop-db";
import { resolveSkillCheck } from "@/lib/games/bible-adventure/character";
import { applyAllyDcToCheck } from "@/lib/games/bible-adventure/ally-bonuses";
import { advanceAdventure } from "@/lib/games/bible-adventure/engine";
import { getSave, updateSaveState } from "@/lib/games/bible-adventure/db";
import {
  appendRollToState,
  applyPlayerChoice,
  applyTurnResult,
  findChoice,
  hasRequiredItem,
  rollContextForAi,
} from "@/lib/games/bible-adventure/state";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI adventure is not configured yet." },
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

  let body: { saveId?: string; choiceId?: string; useInspiration?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const saveId = body.saveId?.trim();
  const choiceId = body.choiceId?.trim();
  if (!saveId || !choiceId) {
    return NextResponse.json({ error: "Missing saveId or choiceId" }, { status: 400 });
  }

  const row = await getSave(user.id, saveId);
  if (!row) {
    return NextResponse.json({ error: "Save not found." }, { status: 404 });
  }

  const state = row.state;
  if (state.ended) {
    return NextResponse.json({ error: "Adventure already ended." }, { status: 400 });
  }

  const choice = findChoice(state, choiceId);
  if (!choice) {
    return NextResponse.json({ error: "Invalid choice." }, { status: 400 });
  }

  if (!hasRequiredItem(state.inventory, choice)) {
    return NextResponse.json({ error: "Missing required item." }, { status: 400 });
  }

  if (!isUsersTurn(row, user.id)) {
    return NextResponse.json({ error: "Not your turn." }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .maybeSingle();
  const actorName =
    (profile?.display_name as string | null) ??
    (profile?.username as string | null) ??
    null;

  const useInspiration = Boolean(body.useInspiration) && !state.inspirationUsed;

  try {
    let afterChoice = applyPlayerChoice(state, choice, actorName);
    let choiceLabel = choice.label;

    if (choice.skillCheck) {
      const effectiveCheck = applyAllyDcToCheck(afterChoice.activeAlly, choice.skillCheck);
      const roll = resolveSkillCheck({
        virtues: afterChoice.virtues,
        check: effectiveCheck,
        useInspiration,
        archetypeId: afterChoice.archetypeId,
      });
      afterChoice = appendRollToState(afterChoice, roll);
      choiceLabel = `${choice.label}\n${rollContextForAi(roll, afterChoice.locale)}`;
    }

    const turn = await advanceAdventure({
      scenarioId: state.scenarioId,
      state: afterChoice,
      choiceLabel,
    });
    const nextState = applyTurnResult(afterChoice, turn);

    await updateSaveState({ userId: user.id, saveId, state: nextState });
    await swapCoopTurn(saveId, user.id);

    const refreshed = await getSave(user.id, saveId);

    const svc = await createServiceClient();
    try {
      await svc.from("game_story_turns").insert({
        user_id: user.id,
        scenario_id: `adv:${state.scenarioId}`,
      });
    } catch {
      // Rate-limit table may not exist in dev
    }

    return NextResponse.json({
      state: nextState,
      coop: refreshed
        ? {
            status: refreshed.coop_status,
            activeTurnUserId: refreshed.active_turn_user_id,
            partnerId: refreshed.partner_id,
            hostId: refreshed.user_id,
          }
        : null,
      rateLimit: { remaining: rate.remaining - 1, limit: rate.limit },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not continue adventure.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
