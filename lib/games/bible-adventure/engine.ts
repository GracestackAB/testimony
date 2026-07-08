import { chatCompletion } from "@/lib/ai/client";
import type { Locale } from "@/lib/i18n/types";
import type { StoryHistoryEntry } from "@/lib/games/story-adventure";
import { sanitizeSkillCheck, virtueLabel, type VirtueId } from "./character";
import { sanitizeEncounterId, validEnemyIdsForPrompt } from "./enemies";
import { sanitizeAllyId, validAllyIdsForPrompt } from "./allies";
import { clampHealthDelta } from "./health";
import { clampTensionDelta } from "./tension";
import { getItem } from "./items";
import { isValidMilestoneId } from "./milestones";
import { getAdventureScenario, type AdventureScenarioId } from "./scenarios";
import type { AdventureChoice, AdventureSaveState, AdventureTurnResult, ChoiceTone } from "./state";

const MAX_HISTORY = 14;
const MAX_CHOICE_LEN = 120;
const MAX_NARRATIVE_LEN = 2200;
const MAX_TURNS = 14;

function inventorySummary(state: AdventureSaveState): string {
  const names = state.inventory
    .map((id) => {
      const item = getItem(id);
      if (!item) return null;
      return state.locale === "en" ? item.nameEn : item.nameSv;
    })
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : state.locale === "sv" ? "(tomt)" : "(empty)";
}

function characterSummary(state: AdventureSaveState, locale: Locale): string {
  const v = state.virtues;
  const parts = (["wisdom", "courage", "compassion", "steadfastness"] as VirtueId[]).map(
    (id) => `${virtueLabel(id, locale)} ${v[id]}`
  );
  return `${state.archetypeId} (level ${state.level}) — ${parts.join(", ")}`;
}

function systemPrompt(locale: Locale, scenarioBrief: string, state: AdventureSaveState): string {
  const lang = locale === "sv" ? "Swedish" : "English";
  const flagStr =
    Object.keys(state.flags).length > 0 ? JSON.stringify(state.flags) : locale === "sv" ? "inga" : "none";

  return `You are the narrative engine for testimony.se — "Bibel-krönika", an adult interactive Bible adventure (${lang}).

Theology & guardrails (non-negotiable):
- Orthodox evangelical Protestant Christianity. Scripture is authoritative.
- Stay faithful to the biblical account. Do not contradict Scripture.
- No new revelation, no "God told me" beyond what the Bible supports.
- No anachronisms (modern tech, slang, politics).
- Portray biblical characters with respect. No mockery of faith.
- If the player chooses cruelty or blasphemy — redirect gently in-story.
- Do not preach at length; show truth through narrative.

Scenario context:
${scenarioBrief}

Current game state:
- Location: ${state.location}
- Faith meter (0–100): ${state.faith}
- Health (HP): ${state.health}/${state.maxHealth}
- Character: ${characterSummary(state, locale)}
- Turn: ${state.turn} (end naturally around turn 10–${MAX_TURNS})
- Inventory: ${inventorySummary(state)}
- Story flags: ${flagStr}
- Quest log: ${state.questLog.length > 0 ? state.questLog.join("; ") : locale === "sv" ? "tom" : "empty"}
- Active encounter: ${state.activeEncounter ?? (locale === "sv" ? "ingen" : "none")}
- Active ally: ${state.activeAlly ?? (locale === "sv" ? "ingen" : "none")}
- Tension (0–100): ${state.tension} — higher = more dramatic stakes
- Chapter: ${state.chapterTitle ?? (locale === "sv" ? "inget" : "none")}

Encounters & antagonists (with portraits):
- When a biblical antagonist appears in the scene, set "encounterId" to their id (shows portrait to player).
- When the scene shifts away, set "encounterId": null.
- Valid encounter ids for this scenario: ${validEnemyIdsForPrompt(state.scenarioId)}
- Use respectfully — these are biblical figures/antagonists, not cartoon villains.
- Confrontations may use skillCheck (courage) and healthDelta; defeating is narrative (faith, wisdom), not graphic combat.
- During encounters, successful skill checks damage the enemy; player sees enemy HP bar.

Allies (biblical friends with portraits):
- When a helpful NPC joins the scene, set "allyId" to their id (shows portrait).
- When they leave, set "allyId": null.
- Valid ally ids for this scenario: ${validAllyIdsForPrompt(state.scenarioId)}
- Allies support the player narratively — not combat units.

- tensionDelta: -15 to +15 when stakes rise or ease (chase, trial, revelation).
- chapterTitle: optional dramatic act title (max 60 chars) at major story beats — e.g. "Elden på Karmel".

D&D-style skill checks (important):
- On 1–2 choices per turn, add "skillCheck": {"virtue": "wisdom|courage|compassion|steadfastness", "dc": 8-16}.
- Match virtue to the action (confront danger=courage, scripture=wisdom, mercy=compassion, endure=steadfastness).
- dc 8-10 easy, 11-13 medium, 14-16 hard.
- Player message may include [Skill check ... SUCCESS/FAILURE] — narrate outcome accordingly.
- On SUCCESS: reward with faith +3 to +8, items, or quest progress.
- On FAILURE: gentle setback (-2 to -6 faith, -3 to -8 health) but always offer hope and a path forward.
- Physical danger, hunger, exhaustion, injury: use healthDelta (-12 to 0). Healing/rest: healthDelta (+1 to +10).
- If health is low (<25% max), narrate weariness; do not kill gratuitously.
- When health would reach 0, end the adventure (ended: true) with compassion — exhaustion, not graphic violence.
- Optionally add "questUpdate": short quest beat (max 80 chars) when story milestone reached.

Innovation — use items meaningfully:
- Occasionally offer a choice with "requiresItem" set to an inventory item id (see valid ids below).
- When the player uses an item wisely, they may gain faith (+5 to +12) or a new item.
- When they act in fear or selfishness, faith may drop (-3 to -10).
- itemsGained/itemsLost must use ONLY valid item ids from the catalog.
- Do not give items the player already has unless consumable was used.

Valid item ids: travel_cloak, scripture_scroll, waterskin, oil_lamp, bread, staff, seal_ring, myrrh, harp

Output rules:
- Write 2–3 vivid paragraphs in second person ("du"/"you").
- Offer exactly 2 or 3 choices with unique snake_case ids.
- Each choice label max ${MAX_CHOICE_LEN} chars.
- Some choices may require an item (requiresItem) — only if player likely has it.
- After ~10–${MAX_TURNS} turns total, move toward ending (ended: true).
- When ended: choices=[], reflection=thoughtful spiritual question.
- faithDelta: integer -12 to +15 (0 if neutral).
- healthDelta: integer -12 to +10 (0 if neutral).
- location: short place name in ${lang}.
- Each choice should include "tone": one of "faith", "wisdom", "courage", "mercy" (hint for the player).
- Optionally award ONE milestoneId when deserved (max once per turn): prayerful_heart, scripture_light, courage_shown, mercy_given, trusted_providence, shared_bread — or null.

Respond ONLY with valid JSON:
{
  "narrative": "string",
  "location": "string",
  "choices": [{"id": "snake_case", "label": "string", "requiresItem": null, "consumesItem": false, "tone": "faith", "skillCheck": null}],
  "itemsGained": [],
  "itemsLost": [],
  "faithDelta": 0,
  "healthDelta": 0,
  "scriptureNote": "string or null",
  "ended": false,
  "reflection": "string or null",
  "newFlags": {},
  "milestoneId": null,
  "questUpdate": null,
  "encounterId": null,
  "allyId": null,
  "tensionDelta": 0,
  "chapterTitle": null
}`;
}

function buildMessages(
  locale: Locale,
  scenarioBrief: string,
  state: AdventureSaveState,
  choiceLabel: string
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const trimmed = state.history.slice(-MAX_HISTORY);
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt(locale, scenarioBrief, state) },
  ];

  for (const entry of trimmed) {
    messages.push({ role: entry.role, content: entry.text });
  }

  messages.push({
    role: "user",
    content:
      locale === "sv"
        ? `Spelaren väljer: «${choiceLabel}»\n\nFortsätt äventyret.`
        : `The player chooses: "${choiceLabel}"\n\nContinue the adventure.`,
  });

  return messages;
}

/**
 * Advance the Bible adventure by one AI turn.
 */
export async function advanceAdventure(input: {
  scenarioId: AdventureScenarioId;
  state: AdventureSaveState;
  choiceLabel: string;
}): Promise<AdventureTurnResult> {
  const scenario = getAdventureScenario(input.scenarioId);
  if (!scenario) throw new Error("Unknown scenario");

  const choice = input.choiceLabel.trim().slice(0, MAX_CHOICE_LEN);
  if (!choice) throw new Error("Empty choice");

  const raw = await chatCompletion(
    buildMessages(
      input.state.locale,
      scenario.aiBrief[input.state.locale],
      input.state,
      choice
    ),
    "write"
  );

  return parseAdventureTurn(raw, input.state.locale, input.state);
}

/** Parse and validate AI JSON with safe fallbacks. */
export function parseAdventureTurn(
  raw: string,
  locale: Locale,
  state: AdventureSaveState
): AdventureTurnResult {
  const fallbackNarrative =
    locale === "sv"
      ? "Vinden bär ett ögonblick av tystnad över det heliga landskapet. Ditt hjärta söker Herren — välj hur du går vidare."
      : "Wind carries a moment of silence over the holy landscape. Your heart seeks the Lord — choose how you proceed.";

  const fallbackChoices: AdventureChoice[] =
    locale === "sv"
      ? [
          { id: "pray", label: "Fortsätt i tyst bön" },
          { id: "seek_wisdom", label: "Sök vishet i Skriften" },
        ]
      : [
          { id: "pray", label: "Continue in quiet prayer" },
          { id: "seek_wisdom", label: "Seek wisdom in Scripture" },
        ];

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return emptyTurnResult(fallbackNarrative, state.location, fallbackChoices);
  }

  try {
    const data = JSON.parse(match[0]) as Partial<AdventureTurnResult> & {
      choices?: Array<Partial<AdventureChoice>>;
    };
    const ended = Boolean(data.ended) || state.turn + 1 >= MAX_TURNS;

    const choices = ended
      ? []
      : parseChoices(data.choices, fallbackChoices, locale);

    if (!ended && choices.length < 2) {
      return {
        narrative: String(data.narrative || fallbackNarrative).slice(0, MAX_NARRATIVE_LEN),
        location: String(data.location || state.location).slice(0, 80),
        choices: fallbackChoices,
        itemsGained: sanitizeItemIds(data.itemsGained),
        itemsLost: sanitizeItemIds(data.itemsLost),
        faithDelta: clampFaithDelta(data.faithDelta),
        healthDelta: clampHealthDelta(data.healthDelta),
        scriptureNote: data.scriptureNote ? String(data.scriptureNote).slice(0, 120) : null,
        ended: false,
        reflection: null,
        newFlags: sanitizeFlags(data.newFlags),
        milestoneId: sanitizeMilestone(data.milestoneId),
        questUpdate: data.questUpdate ? String(data.questUpdate).slice(0, 120) : null,
        encounterId: sanitizeEncounterField(data.encounterId, state.scenarioId),
        allyId: sanitizeAllyField(data.allyId, state.scenarioId),
        tensionDelta: clampTensionDelta(data.tensionDelta),
        chapterTitle: data.chapterTitle ? String(data.chapterTitle).slice(0, 80) : null,
      };
    }

    return {
      narrative: String(data.narrative || fallbackNarrative).slice(0, MAX_NARRATIVE_LEN),
      location: String(data.location || state.location).slice(0, 80),
      choices,
      itemsGained: sanitizeItemIds(data.itemsGained),
      itemsLost: sanitizeItemIds(data.itemsLost),
      faithDelta: clampFaithDelta(data.faithDelta),
      healthDelta: clampHealthDelta(data.healthDelta),
      scriptureNote: data.scriptureNote ? String(data.scriptureNote).slice(0, 120) : null,
      ended,
      reflection: ended && data.reflection ? String(data.reflection).slice(0, 400) : null,
      newFlags: sanitizeFlags(data.newFlags),
      milestoneId: sanitizeMilestone(data.milestoneId),
      questUpdate: data.questUpdate ? String(data.questUpdate).slice(0, 120) : null,
      encounterId: sanitizeEncounterField(data.encounterId, state.scenarioId),
      allyId: sanitizeAllyField(data.allyId, state.scenarioId),
      tensionDelta: clampTensionDelta(data.tensionDelta),
      chapterTitle: data.chapterTitle ? String(data.chapterTitle).slice(0, 80) : null,
    };
  } catch {
    return emptyTurnResult(fallbackNarrative, state.location, fallbackChoices);
  }
}

function emptyTurnResult(
  narrative: string,
  location: string,
  choices: AdventureChoice[]
): AdventureTurnResult {
  return {
    narrative,
    location,
    choices,
    itemsGained: [],
    itemsLost: [],
    faithDelta: 0,
    healthDelta: 0,
    scriptureNote: null,
    ended: false,
    reflection: null,
    newFlags: {},
    milestoneId: null,
    questUpdate: null,
  };
}

const VALID_TONES = new Set<ChoiceTone>(["faith", "wisdom", "courage", "mercy"]);

function parseChoices(
  raw: Array<Partial<AdventureChoice>> | undefined,
  fallback: AdventureChoice[],
  _locale: Locale
): AdventureChoice[] {
  if (!Array.isArray(raw)) return fallback;
  const parsed = raw
    .map((c, i) => ({
      id: String(c.id || `choice_${i}`).slice(0, 40),
      label: String(c.label || "").trim().slice(0, MAX_CHOICE_LEN),
      requiresItem: c.requiresItem ? String(c.requiresItem).slice(0, 40) : null,
      consumesItem: Boolean(c.consumesItem),
      tone: VALID_TONES.has(c.tone as ChoiceTone) ? (c.tone as ChoiceTone) : null,
      skillCheck: sanitizeSkillCheck(c.skillCheck),
    }))
    .filter((c) => c.label.length > 0)
    .slice(0, 3);

  if (parsed.length < 2) return fallback;
  return parsed;
}

function sanitizeItemIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((id) => String(id).trim())
    .filter((id) => Boolean(getItem(id)))
    .slice(0, 3);
}

function clampFaithDelta(raw: unknown): number {
  const n = typeof raw === "number" ? raw : 0;
  return Math.max(-12, Math.min(15, Math.round(n)));
}

function sanitizeFlags(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "boolean") out[k.slice(0, 40)] = v;
  }
  return out;
}

function sanitizeMilestone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  return isValidMilestoneId(id) ? id : null;
}

function sanitizeEncounterField(
  raw: unknown,
  scenarioId: AdventureScenarioId
): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  return sanitizeEncounterId(raw, scenarioId);
}

function sanitizeAllyField(
  raw: unknown,
  scenarioId: AdventureScenarioId
): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  return sanitizeAllyId(raw, scenarioId);
}

export function historyFromState(history: StoryHistoryEntry[]): StoryHistoryEntry[] {
  return history.slice(-MAX_HISTORY);
}
