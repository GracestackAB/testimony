import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUsersTurn } from "@/lib/games/bible-adventure/coop-db";
import { getSave, updateSaveState } from "@/lib/games/bible-adventure/db";
import { applyFreePrayer, applyItemUse, applyRest, applyUltimate, applyFlee, canPrayFree, canRest, canFlee } from "@/lib/games/bible-adventure/state";
import { canUseUltimate } from "@/lib/games/bible-adventure/ultimates";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  let body: { saveId?: string; action?: string; itemId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const saveId = body.saveId?.trim();
  const action = body.action?.trim();
  if (!saveId || !action) {
    return NextResponse.json({ error: "Missing saveId or action" }, { status: 400 });
  }

  const row = await getSave(user.id, saveId);
  if (!row) {
    return NextResponse.json({ error: "Save not found." }, { status: 404 });
  }

  if (row.state.ended) {
    return NextResponse.json({ error: "Adventure already ended." }, { status: 400 });
  }

  if (!isUsersTurn(row, user.id)) {
    return NextResponse.json({ error: "Not your turn." }, { status: 403 });
  }

  try {
    let nextState = row.state;

    if (action === "pray") {
      if (!canPrayFree(nextState)) {
        return NextResponse.json({ error: "Prayer not available right now." }, { status: 400 });
      }
      nextState = applyFreePrayer(nextState);
    } else if (action === "use_item") {
      const itemId = body.itemId?.trim();
      if (!itemId) {
        return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
      }
      const applied = applyItemUse(nextState, itemId);
      if (!applied) {
        return NextResponse.json({ error: "Cannot use item now." }, { status: 400 });
      }
      nextState = applied;
    } else if (action === "rest") {
      const rested = applyRest(nextState);
      if (!rested) {
        return NextResponse.json({ error: "Cannot rest right now." }, { status: 400 });
      }
      nextState = rested;
    } else if (action === "ultimate") {
      if (!canUseUltimate(nextState)) {
        return NextResponse.json({ error: "Ultimate not available." }, { status: 400 });
      }
      const applied = applyUltimate(nextState);
      if (!applied) {
        return NextResponse.json({ error: "Ultimate not available." }, { status: 400 });
      }
      nextState = applied;
    } else if (action === "flee") {
      const fled = applyFlee(nextState);
      if (!fled) {
        return NextResponse.json({ error: "Cannot flee right now." }, { status: 400 });
      }
      nextState = fled;
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    await updateSaveState({ userId: user.id, saveId, state: nextState });
    return NextResponse.json({ state: nextState });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Action failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
