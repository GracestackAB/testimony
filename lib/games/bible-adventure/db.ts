import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/types";
import { isArchetypeId } from "./character";
import { createInitialState, validateState, type AdventureSaveState } from "./state";
import { canUserAccessSave } from "./coop-social";
import { getAdventureScenario, type AdventureScenarioId } from "./scenarios";

export type AdventureSaveRow = {
  id: string;
  user_id: string;
  slot: number;
  title: string;
  scenario_id: string;
  locale: Locale;
  state: AdventureSaveState;
  turn_count: number;
  updated_at: string;
  partner_id?: string | null;
  coop_status?: string;
  active_turn_user_id?: string | null;
};

const SAVE_COLUMNS =
  "id, user_id, slot, title, scenario_id, locale, state, turn_count, updated_at, partner_id, coop_status, active_turn_user_id";

export type SaveSlotSummary = {
  slot: number;
  save: AdventureSaveRow | null;
};

const MAX_SLOTS = 3;

export async function listSaveSlots(userId: string): Promise<SaveSlotSummary[]> {
  const svc = await createServiceClient();
  const { data } = await svc
    .from("bible_adventure_saves")
    .select(SAVE_COLUMNS)
    .eq("user_id", userId)
    .order("slot", { ascending: true });

  const bySlot = new Map<number, AdventureSaveRow>();
  for (const row of data ?? []) {
    bySlot.set(row.slot as number, row as AdventureSaveRow);
  }

  return Array.from({ length: MAX_SLOTS }, (_, i) => ({
    slot: i + 1,
    save: bySlot.get(i + 1) ?? null,
  }));
}

export async function getSave(userId: string, saveId: string): Promise<AdventureSaveRow | null> {
  const svc = await createServiceClient();
  const { data } = await svc
    .from("bible_adventure_saves")
    .select(SAVE_COLUMNS)
    .eq("id", saveId)
    .maybeSingle();

  if (!data) return null;
  if (!canUserAccessSave(data as AdventureSaveRow, userId)) return null;
  const state = validateState(data.state);
  if (!state) return null;
  return { ...(data as AdventureSaveRow), state };
}

export async function createSave(input: {
  userId: string;
  slot: number;
  scenarioId: AdventureScenarioId;
  locale: Locale;
  archetypeId: string;
}): Promise<AdventureSaveRow> {
  if (input.slot < 1 || input.slot > MAX_SLOTS) {
    throw new Error("Invalid slot");
  }

  const scenario = getAdventureScenario(input.scenarioId);
  if (!scenario) throw new Error("Unknown scenario");
  if (!isArchetypeId(input.archetypeId)) throw new Error("Invalid archetype");

  const state = createInitialState(scenario, input.locale, input.archetypeId);
  const title = scenario.title[input.locale];
  const svc = await createServiceClient();

  const { data, error } = await svc
    .from("bible_adventure_saves")
    .upsert(
      {
        user_id: input.userId,
        slot: input.slot,
        title,
        scenario_id: input.scenarioId,
        locale: input.locale,
        state,
        turn_count: 0,
        updated_at: new Date().toISOString(),
        coop_status: "solo",
        active_turn_user_id: input.userId,
      },
      { onConflict: "user_id,slot" }
    )
    .select(SAVE_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create save");
  }

  return data as AdventureSaveRow;
}

export async function updateSaveState(input: {
  userId: string;
  saveId: string;
  state: AdventureSaveState;
}): Promise<void> {
  const existing = await getSave(input.userId, input.saveId);
  if (!existing) throw new Error("Save not found");

  const svc = await createServiceClient();
  const { error } = await svc
    .from("bible_adventure_saves")
    .update({
      state: input.state,
      turn_count: input.state.turn,
      updated_at: new Date().toISOString(),
      coop_status: input.state.ended && existing.coop_status === "active" ? "ended" : existing.coop_status,
    })
    .eq("id", input.saveId);

  if (error) throw new Error(error.message);
}

export async function deleteSave(userId: string, saveId: string): Promise<boolean> {
  const svc = await createServiceClient();
  const { error, count } = await svc
    .from("bible_adventure_saves")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("id", saveId);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}
