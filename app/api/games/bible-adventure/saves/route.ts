import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import {
  createSave,
  deleteSave,
  getSave,
  listSaveSlots,
} from "@/lib/games/bible-adventure/db";
import { fetchProfiles } from "@/lib/games/bible-adventure/coop-db";
import { isArchetypeId } from "@/lib/games/bible-adventure/character";
import { isAdventureScenarioId } from "@/lib/games/bible-adventure/scenarios";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get("id");

  try {
    if (id) {
      const save = await getSave(user.id, id);
      if (!save) {
        return NextResponse.json({ error: "Save not found." }, { status: 404 });
      }
      const profileIds = [save.user_id, save.partner_id].filter(Boolean) as string[];
      const profiles = await fetchProfiles(profileIds);
      return NextResponse.json({
        save,
        userId: user.id,
        host: profiles.get(save.user_id) ?? null,
        partner: save.partner_id ? profiles.get(save.partner_id) ?? null : null,
      });
    }

    const slots = await listSaveSlots(user.id);
    return NextResponse.json({ slots, userId: user.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not load saves.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  let body: { scenarioId?: string; slot?: number; locale?: string; archetypeId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scenarioId = body.scenarioId?.trim();
  if (!scenarioId || !isAdventureScenarioId(scenarioId)) {
    return NextResponse.json({ error: "Invalid scenario" }, { status: 400 });
  }

  const slot = Number(body.slot);
  if (!Number.isInteger(slot) || slot < 1 || slot > 3) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }

  const locale = body.locale === "en" ? "en" : await getLocale();
  const archetypeId = body.archetypeId?.trim();
  if (!archetypeId || !isArchetypeId(archetypeId)) {
    return NextResponse.json({ error: "Invalid archetype" }, { status: 400 });
  }

  try {
    const save = await createSave({ userId: user.id, slot, scenarioId, locale, archetypeId });
    return NextResponse.json({ save });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not create save.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing save id" }, { status: 400 });
  }

  try {
    const ok = await deleteSave(user.id, id);
    if (!ok) {
      return NextResponse.json({ error: "Save not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not delete save.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
