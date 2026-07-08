import type { Locale } from "@/lib/i18n/types";
import type { StoryHistoryEntry } from "@/lib/games/story-adventure";
import {
  applyXpGain,
  createVirtues,
  levelFromXp,
  levelUpVirtues,
  type ArchetypeId,
  type RollResult,
  type SkillCheck,
  type Virtues,
} from "./character";
import {
  clampHealth,
  clampHealthDelta,
  damageFromFailedCheck,
  maxHealthFor,
  restHealAmount,
  MAX_REST_COUNT,
  LEVEL_HEALTH_ON_LEVELUP,
} from "./health";
import {
  damageToEnemy,
  DEFEAT_FAITH_BONUS,
  DEFEAT_XP_BONUS,
  enemyCounterDamage,
  initEnemyHealth,
} from "./combat";
import { getAlly, sanitizeAllyId, type AllyId } from "./allies";
import { getAllyBonus } from "./ally-bonuses";
import { ITEM_USE_EFFECTS, whisperText } from "./item-effects";
import { getItem } from "./items";
import { pickDefeatLoot } from "./loot";
import { isValidMilestoneId } from "./milestones";
import type { AdventureScenario, AdventureScenarioId } from "./scenarios";
import { getAdventureScenario } from "./scenarios";
import type { EnemyId } from "./enemies";
import { getEnemy, sanitizeEncounterId } from "./enemies";
import { clampTension, clampTensionDelta, DEFAULT_TENSION } from "./tension";
import {
  canUseUltimate,
  getUltimate,
  MERCY_STRIKE_BONUS,
  PILGRIM_HEAL_RATIO,
  PILGRIM_TENSION_RELIEF,
  SERVANT_FAITH_BONUS,
  ultimateName,
  type UltimateBuff,
} from "./ultimates";

export type ChoiceTone = "faith" | "wisdom" | "courage" | "mercy";

export type AdventureChoice = {
  id: string;
  label: string;
  requiresItem?: string | null;
  consumesItem?: boolean;
  tone?: ChoiceTone | null;
  skillCheck?: SkillCheck | null;
};

export type ChronicleEntry =
  | { kind: "narrative"; text: string; scriptureNote?: string | null }
  | { kind: "choice"; label: string; actorName?: string | null }
  | { kind: "item"; action: "gain" | "lose"; itemId: string }
  | { kind: "faith"; delta: number; newValue: number }
  | { kind: "health"; delta: number; newValue: number; maxHealth: number }
  | { kind: "whisper"; text: string; scriptureRef?: string | null }
  | { kind: "milestone"; milestoneId: string }
  | {
      kind: "roll";
      virtue: string;
      d20: number;
      d20Second?: number;
      modifier: number;
      total: number;
      dc: number;
      success: boolean;
      inspiration: boolean;
      critical?: "nat20" | "nat1" | null;
    }
  | { kind: "quest"; text: string }
  | { kind: "level"; level: number }
  | { kind: "encounter"; enemyId: string; action: "appear" | "depart" | "defeat" }
  | { kind: "chapter"; title: string }
  | { kind: "tension"; delta: number; newValue: number }
  | { kind: "enemy_hit"; enemyId: string; damage: number; remaining: number }
  | { kind: "critical"; roll: "nat20" | "nat1" }
  | { kind: "ultimate"; name: string }
  | { kind: "ally"; allyId: string; action: "appear" | "depart" }
  | { kind: "loot"; itemId: string; source: "defeat" }
  | { kind: "flee"; enemyId: string };

export type AdventureSaveState = {
  scenarioId: AdventureScenarioId;
  locale: Locale;
  location: string;
  faith: number;
  /** Livskraft / HP (0 = utmattad). */
  health: number;
  maxHealth: number;
  restsUsed: number;
  turn: number;
  inventory: string[];
  flags: Record<string, boolean>;
  chronicle: ChronicleEntry[];
  history: StoryHistoryEntry[];
  choices: AdventureChoice[];
  ended: boolean;
  reflection: string | null;
  /** Unika Skriftreferenser insamlade under äventyret. */
  scriptures: string[];
  /** Platser spelaren besökt. */
  locations: string[];
  /** Erhållna milstolpar (id). */
  milestones: string[];
  /** Tur då föremål senast användes (max 1 per tur). */
  itemUseTurn: number;
  /** Har spelaren bett den kostnadsfria bönbönen? */
  prayedFree: boolean;
  /** Karaktärsark (D&D-inspirerat). */
  archetypeId: ArchetypeId;
  virtues: Virtues;
  xp: number;
  level: number;
  questLog: string[];
  inspirationUsed: boolean;
  /** Aktiv antagonist i scenen (visas med porträtt). */
  activeEncounter: EnemyId | null;
  /** Mötta fiender under äventyret (bestiarium). */
  encounteredEnemies: EnemyId[];
  defeatedEnemies: EnemyId[];
  /** Fiende-HP under aktivt möte. */
  enemyHealth: number | null;
  enemyMaxHealth: number | null;
  /** Dramatisk spänning 0–100. */
  tension: number;
  /** Aktuellt kapitel / akt. */
  chapterTitle: string | null;
  /** Ultimat förmåga använd (en gång per äventyr). */
  ultimateUsed: boolean;
  /** Aktiv buff från ultimat (prophet/guardian/servant). */
  ultimateBuff: UltimateBuff | null;
  /** Allierad NPC i scenen (porträtt). */
  activeAlly: AllyId | null;
  /** Mötta allierade under äventyret. */
  metAllies: AllyId[];
};

export type AdventureTurnResult = {
  narrative: string;
  location: string;
  choices: AdventureChoice[];
  itemsGained: string[];
  itemsLost: string[];
  faithDelta: number;
  healthDelta?: number;
  scriptureNote: string | null;
  ended: boolean;
  reflection: string | null;
  newFlags?: Record<string, boolean>;
  milestoneId?: string | null;
  questUpdate?: string | null;
  encounterId?: string | null;
  tensionDelta?: number;
  chapterTitle?: string | null;
  allyId?: string | null;
};

const MIN_FAITH = 0;
const MAX_FAITH = 100;
const DEFAULT_FAITH = 50;
const PRAYER_FAITH_BOOST = 8;
const PRAYER_FAITH_THRESHOLD = 35;

export function clampFaith(value: number): number {
  return Math.max(MIN_FAITH, Math.min(MAX_FAITH, value));
}

function syncMaxHealth(state: AdventureSaveState): number {
  return maxHealthFor(state.archetypeId, state.level);
}

function resolvePlayerDamage(
  state: AdventureSaveState,
  dmg: number,
  chronicle: ChronicleEntry[]
): { dmg: number; ultimateBuff: UltimateBuff | null; chronicle: ChronicleEntry[] } {
  if (dmg <= 0) {
    return { dmg: 0, ultimateBuff: state.ultimateBuff, chronicle };
  }
  if (state.ultimateBuff === "damage_shield") {
    const ult = getUltimate(state.archetypeId);
    return {
      dmg: 0,
      ultimateBuff: null,
      chronicle: [...chronicle, { kind: "ultimate", name: ultimateName(ult, state.locale) }],
    };
  }
  return { dmg, ultimateBuff: state.ultimateBuff, chronicle };
}

export function applyHealthDelta(
  state: AdventureSaveState,
  delta: number,
  chronicle: ChronicleEntry[] = [...state.chronicle]
): { health: number; maxHealth: number; chronicle: ChronicleEntry[]; ended: boolean; reflection: string | null } {
  const maxHealth = syncMaxHealth(state);
  const health = clampHealth(state.health + delta, maxHealth);
  const applied = health - state.health;
  if (applied !== 0) {
    chronicle.push({ kind: "health", delta: applied, newValue: health, maxHealth });
  }
  let ended = state.ended;
  let reflection = state.reflection;
  if (health <= 0 && !ended) {
    ended = true;
    reflection =
      state.locale === "sv"
        ? "Kroppen svek dig — men är inte Herrens nåd större än vår svaghet? Vad lär du dig av att falla och ändå bli buren?"
        : "Your body gave way — but is not the Lord's grace greater than our weakness? What do you learn from falling and still being carried?";
  }
  return { health, maxHealth, chronicle, ended, reflection };
}

function trackScripture(refs: string[], note: string | null | undefined): string[] {
  if (!note?.trim()) return refs;
  const ref = note.trim();
  return refs.includes(ref) ? refs : [...refs, ref];
}

function trackLocation(locations: string[], location: string): string[] {
  const loc = location.trim();
  if (!loc || locations.includes(loc)) return locations;
  return [...locations, loc];
}

function trackMilestone(milestones: string[], id: string | null | undefined): string[] {
  if (!id || !isValidMilestoneId(id) || milestones.includes(id)) return milestones;
  return [...milestones, id];
}

export function createInitialState(
  scenario: AdventureScenario,
  locale: Locale,
  archetypeId: ArchetypeId
): AdventureSaveState {
  const choices = filterAvailableChoices(scenario.initialChoices[locale], scenario.startingItems);
  const startLoc = scenario.startLocation[locale];
  const maxHealth = maxHealthFor(archetypeId, 1);
  return {
    scenarioId: scenario.id,
    locale,
    location: startLoc,
    faith: DEFAULT_FAITH,
    health: maxHealth,
    maxHealth,
    restsUsed: 0,
    turn: 0,
    inventory: [...scenario.startingItems],
    flags: {},
    chronicle: [{ kind: "narrative", text: scenario.opening[locale] }],
    history: [],
    choices,
    ended: false,
    reflection: null,
    scriptures: [],
    locations: [startLoc],
    milestones: [],
    itemUseTurn: -1,
    prayedFree: false,
    archetypeId,
    virtues: createVirtues(archetypeId),
    xp: 0,
    level: 1,
    questLog: [],
    inspirationUsed: false,
    activeEncounter: null,
    encounteredEnemies: [],
    defeatedEnemies: [],
    enemyHealth: null,
    enemyMaxHealth: null,
    tension: DEFAULT_TENSION,
    chapterTitle: null,
    ultimateUsed: false,
    ultimateBuff: null,
    activeAlly: null,
    metAllies: [],
  };
}

export function filterAvailableChoices(
  choices: AdventureChoice[],
  inventory: string[]
): AdventureChoice[] {
  const owned = new Set(inventory);
  return choices.filter((c) => !c.requiresItem || owned.has(c.requiresItem));
}

export function hasRequiredItem(inventory: string[], choice: AdventureChoice): boolean {
  if (!choice.requiresItem) return true;
  return inventory.includes(choice.requiresItem);
}

export function canPrayFree(state: AdventureSaveState): boolean {
  return !state.ended && !state.prayedFree && state.faith < PRAYER_FAITH_THRESHOLD;
}

export function canRest(state: AdventureSaveState): boolean {
  if (state.ended || state.health <= 0) return false;
  if (state.restsUsed >= MAX_REST_COUNT) return false;
  return state.health < state.maxHealth;
}

const FLEE_TENSION_GAIN = 15;
const FLEE_DAMAGE_RATIO = 0.08;

export function canFlee(state: AdventureSaveState): boolean {
  return !state.ended && state.activeEncounter !== null && state.health > 0;
}

export function applyFlee(state: AdventureSaveState): AdventureSaveState | null {
  if (!canFlee(state) || !state.activeEncounter) return null;

  const enemyId = state.activeEncounter;
  let chronicle: ChronicleEntry[] = [
    ...state.chronicle,
    { kind: "flee", enemyId },
    { kind: "encounter", enemyId, action: "depart" },
  ];
  let ultimateBuff = state.ultimateBuff;
  const rawDmg = Math.max(3, Math.floor(state.maxHealth * FLEE_DAMAGE_RATIO));
  const resolved = resolvePlayerDamage({ ...state, ultimateBuff }, rawDmg, chronicle);
  chronicle = resolved.chronicle;
  ultimateBuff = resolved.ultimateBuff;

  let health = state.health;
  let maxHealth = state.maxHealth;
  let ended = state.ended;
  let reflection = state.reflection;
  if (resolved.dmg > 0) {
    const h = applyHealthDelta({ ...state, health, maxHealth, ended, reflection }, -resolved.dmg, chronicle);
    health = h.health;
    maxHealth = h.maxHealth;
    chronicle = h.chronicle;
    ended = h.ended;
    reflection = h.reflection;
  }

  const tension = clampTension(state.tension + FLEE_TENSION_GAIN);
  const tensionDelta = tension - state.tension;
  if (tensionDelta !== 0) {
    chronicle.push({ kind: "tension", delta: tensionDelta, newValue: tension });
  }

  return {
    ...state,
    health,
    maxHealth,
    chronicle,
    ended,
    reflection,
    ultimateBuff,
    tension,
    activeEncounter: null,
    enemyHealth: null,
    enemyMaxHealth: null,
    choices: ended ? [] : state.choices,
  };
}

export function applyRest(state: AdventureSaveState): AdventureSaveState | null {
  if (!canRest(state)) return null;

  const heal = restHealAmount(state.maxHealth);
  const whisper =
    state.locale === "sv"
      ? "Du sätter dig i skuggan och hämtar andan. Kroppen får en stunds ro — som Jesus som vilade i båten."
      : "You sit in the shade and catch your breath. Your body finds a moment's rest — as Jesus rested in the boat.";

  const { health, maxHealth, chronicle, ended, reflection } = applyHealthDelta(state, heal, [
    ...state.chronicle,
    { kind: "whisper", text: whisper, scriptureRef: "Mark 4:38" },
  ]);

  return {
    ...state,
    health,
    maxHealth,
    restsUsed: state.restsUsed + 1,
    chronicle,
    ended,
    reflection,
    choices: ended ? [] : state.choices,
  };
}

export function applyUltimate(state: AdventureSaveState): AdventureSaveState | null {
  if (!canUseUltimate(state)) return null;

  const ult = getUltimate(state.archetypeId);
  const name = ultimateName(ult, state.locale);
  let chronicle: ChronicleEntry[] = [...state.chronicle, { kind: "ultimate", name }];
  let faith = state.faith;
  let health = state.health;
  let maxHealth = state.maxHealth;
  let tension = state.tension;
  let ultimateBuff: UltimateBuff | null = state.ultimateBuff;
  let ended = state.ended;
  let reflection = state.reflection;

  if (ult.buff === "instant_heal") {
    const heal = Math.round(maxHealth * PILGRIM_HEAL_RATIO);
    const h = applyHealthDelta({ ...state, health, maxHealth }, heal, chronicle);
    health = h.health;
    maxHealth = h.maxHealth;
    chronicle = h.chronicle;
    ended = h.ended;
    reflection = h.reflection;
    tension = clampTension(tension - PILGRIM_TENSION_RELIEF);
    const td = tension - state.tension;
    if (td !== 0) {
      chronicle.push({ kind: "tension", delta: td, newValue: tension });
    }
    ultimateBuff = null;
  } else if (ult.buff === "wisdom_auto" || ult.buff === "damage_shield" || ult.buff === "mercy_strike") {
    ultimateBuff = ult.buff;
    if (ult.buff === "mercy_strike") {
      faith = clampFaith(faith + SERVANT_FAITH_BONUS);
      chronicle.push({ kind: "faith", delta: SERVANT_FAITH_BONUS, newValue: faith });
    }
  }

  return {
    ...state,
    ultimateUsed: true,
    ultimateBuff,
    faith,
    health,
    maxHealth,
    tension,
    chronicle,
    ended,
    reflection,
    choices: ended ? [] : state.choices,
  };
}

export function applyFreePrayer(state: AdventureSaveState): AdventureSaveState {
  if (!canPrayFree(state)) return state;

  const faith = clampFaith(state.faith + PRAYER_FAITH_BOOST);
  const whisper =
    state.locale === "sv"
      ? "Du böjer knä där du står. Inga ord behövs — Herren känner ditt hjärta."
      : "You kneel where you stand. No words are needed — the Lord knows your heart.";

  return {
    ...state,
    faith,
    prayedFree: true,
    scriptures: trackScripture(state.scriptures, "Rom 8:26"),
    milestones: trackMilestone(state.milestones, "prayerful_heart"),
    chronicle: [
      ...state.chronicle,
      { kind: "whisper", text: whisper, scriptureRef: "Rom 8:26" },
      { kind: "faith", delta: PRAYER_FAITH_BOOST, newValue: faith },
      { kind: "milestone", milestoneId: "prayerful_heart" },
    ],
  };
}

export function applyItemUse(state: AdventureSaveState, itemId: string): AdventureSaveState | null {
  const effect = ITEM_USE_EFFECTS[itemId];
  if (!canUseItem(state, itemId) || !effect) return null;

  let inventory = [...state.inventory];
  if (effect.consumes) {
    inventory = inventory.filter((id) => id !== itemId);
  }

  const faith = clampFaith(state.faith + effect.faithDelta);
  let chronicle: ChronicleEntry[] = [
    ...state.chronicle,
    {
      kind: "whisper",
      text: whisperText(effect, state.locale),
      scriptureRef: effect.scriptureRef ?? null,
    },
    { kind: "faith", delta: effect.faithDelta, newValue: faith },
  ];

  let health = state.health;
  let maxHealth = state.maxHealth;
  let ended = state.ended;
  let reflection = state.reflection;
  if (effect.healthDelta) {
    const h = applyHealthDelta({ ...state, health, maxHealth, ended, reflection }, effect.healthDelta, chronicle);
    health = h.health;
    maxHealth = h.maxHealth;
    chronicle = h.chronicle;
    ended = h.ended;
    reflection = h.reflection;
  }

  if (effect.consumes) {
    chronicle.push({ kind: "item", action: "lose", itemId });
  }

  let milestones = state.milestones;
  if (effect.milestoneId) {
    milestones = trackMilestone(milestones, effect.milestoneId);
    chronicle.push({ kind: "milestone", milestoneId: effect.milestoneId });
  }

  return {
    ...state,
    inventory,
    faith,
    health,
    maxHealth,
    ended,
    reflection,
    choices: ended ? [] : state.choices,
    itemUseTurn: state.turn,
    scriptures: trackScripture(state.scriptures, effect.scriptureRef),
    milestones,
    chronicle,
  };
}

function canUseItem(state: AdventureSaveState, itemId: string): boolean {
  if (state.ended || !state.inventory.includes(itemId)) return false;
  if (!ITEM_USE_EFFECTS[itemId]) return false;
  return state.itemUseTurn !== state.turn;
}

export function applyPlayerChoice(
  state: AdventureSaveState,
  choice: AdventureChoice,
  actorName?: string | null
): AdventureSaveState {
  let inventory = [...state.inventory];
  if (choice.consumesItem && choice.requiresItem) {
    inventory = inventory.filter((id) => id !== choice.requiresItem);
  }

  let chronicle: ChronicleEntry[] = [
    ...state.chronicle,
    { kind: "choice", label: choice.label, actorName: actorName ?? null },
  ];

  if (choice.consumesItem && choice.requiresItem) {
    chronicle.push({ kind: "item", action: "lose", itemId: choice.requiresItem });
  }

  const history: StoryHistoryEntry[] = [
    ...state.history,
    { role: "user", text: choice.label },
  ];

  return {
    ...state,
    inventory,
    chronicle,
    history,
    choices: [],
  };
}

export function appendRollToState(
  state: AdventureSaveState,
  roll: RollResult
): AdventureSaveState {
  let rollToApply = roll;
  let ultimateBuff = state.ultimateBuff;
  if (ultimateBuff === "wisdom_auto" && roll.virtue === "wisdom") {
    rollToApply = {
      ...roll,
      success: true,
      total: Math.max(roll.total, roll.dc),
    };
    ultimateBuff = null;
  }

  let chronicle: ChronicleEntry[] = [
    ...state.chronicle,
    {
      kind: "roll",
      virtue: rollToApply.virtue,
      d20: rollToApply.d20,
      d20Second: rollToApply.d20Second,
      modifier: rollToApply.modifier,
      total: rollToApply.total,
      dc: rollToApply.dc,
      success: rollToApply.success,
      inspiration: rollToApply.inspiration,
      critical: rollToApply.critical,
    },
  ];

  if (rollToApply.critical === "nat20") chronicle.push({ kind: "critical", roll: "nat20" });
  if (rollToApply.critical === "nat1") chronicle.push({ kind: "critical", roll: "nat1" });

  let xp = applyXpGain(state.xp, rollToApply.success);
  let level = levelFromXp(xp);
  let virtues = state.virtues;
  let maxHealth = syncMaxHealth({ ...state, level });
  let health = clampHealth(state.health, maxHealth);
  let faith = state.faith;
  let tension = clampTension(state.tension + (rollToApply.success ? -3 : 6));
  let activeEncounter = state.activeEncounter;
  let enemyHealth = state.enemyHealth;
  let enemyMaxHealth = state.enemyMaxHealth;
  let defeatedEnemies = [...state.defeatedEnemies];
  let inventory = [...state.inventory];

  if (rollToApply.critical === "nat20") tension = clampTension(tension - 5);
  if (rollToApply.critical === "nat1") tension = clampTension(tension + 8);

  if (level > state.level) {
    virtues = levelUpVirtues(virtues, state.archetypeId, level, state.level);
    chronicle.push({ kind: "level", level });
    maxHealth = maxHealthFor(state.archetypeId, level);
    const before = health;
    health = clampHealth(health + LEVEL_HEALTH_ON_LEVELUP, maxHealth);
    const gained = health - before;
    if (gained > 0) {
      chronicle.push({ kind: "health", delta: gained, newValue: health, maxHealth });
    }
  }

  let ended = state.ended;
  let reflection = state.reflection;

  if (activeEncounter && enemyHealth !== null && rollToApply.success) {
    let dmg = damageToEnemy(rollToApply);
    if (ultimateBuff === "mercy_strike") {
      dmg += MERCY_STRIKE_BONUS;
      ultimateBuff = null;
    }
    enemyHealth = Math.max(0, enemyHealth - dmg);
    chronicle.push({
      kind: "enemy_hit",
      enemyId: activeEncounter,
      damage: dmg,
      remaining: enemyHealth,
    });
    if (rollToApply.critical === "nat20") {
      faith = clampFaith(faith + 3);
      chronicle.push({ kind: "faith", delta: 3, newValue: faith });
    }
    if (enemyHealth <= 0) {
      const defeatedId = activeEncounter;
      chronicle.push({ kind: "encounter", enemyId: defeatedId, action: "defeat" });
      if (!defeatedEnemies.includes(defeatedId)) {
        defeatedEnemies = [...defeatedEnemies, defeatedId];
      }
      xp += DEFEAT_XP_BONUS;
      faith = clampFaith(faith + DEFEAT_FAITH_BONUS);
      chronicle.push({ kind: "faith", delta: DEFEAT_FAITH_BONUS, newValue: faith });
      tension = clampTension(tension - 25);
      const lootId = pickDefeatLoot(defeatedId, inventory, Math.random());
      if (lootId && getItem(lootId)) {
        inventory = [...inventory, lootId];
        chronicle.push({ kind: "loot", itemId: lootId, source: "defeat" });
        chronicle.push({ kind: "item", action: "gain", itemId: lootId });
      }
      activeEncounter = null;
      enemyHealth = null;
      enemyMaxHealth = null;
    }
  } else if (!rollToApply.success) {
    const rawDmg =
      activeEncounter && enemyHealth !== null
        ? enemyCounterDamage(rollToApply)
        : damageFromFailedCheck(rollToApply.total, rollToApply.dc);
    const resolved = resolvePlayerDamage({ ...state, ultimateBuff }, rawDmg, chronicle);
    chronicle = resolved.chronicle;
    ultimateBuff = resolved.ultimateBuff;
    if (resolved.dmg > 0) {
      const h = applyHealthDelta(
        { ...state, health, maxHealth, ended, reflection, faith },
        -resolved.dmg,
        chronicle
      );
      health = h.health;
      maxHealth = h.maxHealth;
      chronicle = h.chronicle;
      ended = h.ended;
      reflection = h.reflection;
    }
  }

  const tensionDelta = tension - state.tension;
  if (tensionDelta !== 0) {
    chronicle.push({ kind: "tension", delta: tensionDelta, newValue: tension });
  }

  return {
    ...state,
    chronicle,
    xp,
    level,
    virtues,
    health,
    maxHealth,
    faith,
    tension,
    activeEncounter,
    enemyHealth,
    enemyMaxHealth,
    defeatedEnemies,
    inventory,
    ended,
    reflection,
    ultimateBuff,
    choices: ended ? [] : state.choices,
    inspirationUsed: rollToApply.inspiration ? true : state.inspirationUsed,
  };
}

export function rollContextForAi(roll: RollResult, locale: Locale): string {
  const outcome = roll.success
    ? locale === "sv"
      ? "LYCKAT"
      : "SUCCESS"
    : locale === "sv"
      ? "MISSLYCKAT"
      : "FAILURE";
  const crit =
    roll.critical === "nat20"
      ? locale === "sv"
        ? " KRITISK 20!"
        : " CRITICAL 20!"
      : roll.critical === "nat1"
        ? locale === "sv"
          ? " KRITISK 1!"
          : " CRITICAL 1!"
        : "";
  return locale === "sv"
    ? `[Tärningsprov ${roll.virtue.toUpperCase()}: d20=${roll.d20}${roll.d20Second ? `+${roll.d20Second}` : ""} +${roll.modifier} = ${roll.total} mot SV ${roll.dc} — ${outcome}${crit}]`
    : `[Skill check ${roll.virtue.toUpperCase()}: d20=${roll.d20}${roll.d20Second ? `+${roll.d20Second}` : ""} +${roll.modifier} = ${roll.total} vs DC ${roll.dc} — ${outcome}${crit}]`;
}

export function applyTurnResult(
  state: AdventureSaveState,
  result: AdventureTurnResult
): AdventureSaveState {
  let faith = clampFaith(state.faith + result.faithDelta);
  let inventory = [...state.inventory];

  for (const id of result.itemsLost) {
    if (inventory.includes(id)) {
      inventory = inventory.filter((itemId) => itemId !== id);
    }
  }

  for (const id of result.itemsGained) {
    if (getItem(id) && !inventory.includes(id)) {
      inventory.push(id);
    }
  }

  let chronicle: ChronicleEntry[] = [...state.chronicle];
  chronicle.push({
    kind: "narrative",
    text: result.narrative,
    scriptureNote: result.scriptureNote,
  });

  if (result.faithDelta !== 0) {
    chronicle.push({
      kind: "faith",
      delta: result.faithDelta,
      newValue: faith,
    });
  }

  for (const id of result.itemsGained) {
    if (getItem(id)) chronicle.push({ kind: "item", action: "gain", itemId: id });
  }
  for (const id of result.itemsLost) {
    if (getItem(id)) chronicle.push({ kind: "item", action: "lose", itemId: id });
  }

  let milestones = trackMilestone(state.milestones, result.milestoneId);
  if (result.milestoneId && isValidMilestoneId(result.milestoneId)) {
    chronicle.push({ kind: "milestone", milestoneId: result.milestoneId });
  }

  let questLog = [...state.questLog];
  if (result.questUpdate?.trim()) {
    const q = result.questUpdate.trim().slice(0, 120);
    if (!questLog.includes(q)) {
      questLog = [...questLog, q];
      chronicle.push({ kind: "quest", text: q });
    }
  }

  let maxHealth = syncMaxHealth(state);
  let health = clampHealth(state.health, maxHealth);
  let ended = result.ended || state.ended;
  let reflection = result.ended ? result.reflection : state.reflection;
  let ultimateBuff = state.ultimateBuff;

  const healthDelta = clampHealthDelta(result.healthDelta ?? 0);
  if (healthDelta < 0) {
    const resolved = resolvePlayerDamage({ ...state, ultimateBuff }, -healthDelta, chronicle);
    chronicle = resolved.chronicle;
    ultimateBuff = resolved.ultimateBuff;
    if (resolved.dmg > 0) {
      const h = applyHealthDelta(
        { ...state, health, maxHealth, ended, reflection },
        -resolved.dmg,
        chronicle
      );
      health = h.health;
      maxHealth = h.maxHealth;
      chronicle = h.chronicle;
      if (h.ended) {
        ended = true;
        reflection = h.reflection;
      }
    }
  } else if (healthDelta > 0) {
    const h = applyHealthDelta({ ...state, health, maxHealth, ended, reflection }, healthDelta, chronicle);
    health = h.health;
    maxHealth = h.maxHealth;
    chronicle = h.chronicle;
    if (h.ended) {
      ended = true;
      reflection = h.reflection;
    }
  }

  let xp = state.xp;
  let level = state.level;
  let virtues = state.virtues;
  if (result.ended && !state.ended) {
    xp += 25;
    level = levelFromXp(xp);
    if (level > state.level) {
      virtues = levelUpVirtues(virtues, state.archetypeId, level, state.level);
      chronicle.push({ kind: "level", level });
      maxHealth = maxHealthFor(state.archetypeId, level);
      const before = health;
      health = clampHealth(health + LEVEL_HEALTH_ON_LEVELUP, maxHealth);
      const gained = health - before;
      if (gained > 0) {
        chronicle.push({ kind: "health", delta: gained, newValue: health, maxHealth });
      }
    }
  }

  const history: StoryHistoryEntry[] = [
    ...state.history,
    { role: "assistant", text: result.narrative },
  ];

  const flags = { ...state.flags, ...(result.newFlags ?? {}) };
  const choices = ended ? [] : filterAvailableChoices(result.choices, inventory);
  const location = result.location || state.location;

  let activeEncounter = state.activeEncounter;
  let encounteredEnemies = [...state.encounteredEnemies];
  let defeatedEnemies = [...state.defeatedEnemies];
  let enemyHealth = state.enemyHealth;
  let enemyMaxHealth = state.enemyMaxHealth;
  let tension = state.tension;
  let chapterTitle = state.chapterTitle;
  let activeAlly = state.activeAlly;
  let metAllies = [...state.metAllies];

  if (result.chapterTitle?.trim()) {
    const title = result.chapterTitle.trim().slice(0, 80);
    if (title !== chapterTitle) {
      chapterTitle = title;
      chronicle.push({ kind: "chapter", title });
    }
  }

  const tensionDelta = clampTensionDelta(result.tensionDelta ?? 0);
  if (tensionDelta !== 0) {
    const before = tension;
    tension = clampTension(tension + tensionDelta);
    chronicle.push({ kind: "tension", delta: tension - before, newValue: tension });
  }

  if (result.encounterId !== undefined) {
    const next =
      result.encounterId === null
        ? null
        : sanitizeEncounterId(result.encounterId, state.scenarioId);
    if (next && next !== state.activeEncounter) {
      chronicle.push({ kind: "encounter", enemyId: next, action: "appear" });
      if (!encounteredEnemies.includes(next)) {
        encounteredEnemies = [...encounteredEnemies, next];
      }
      const enemy = getEnemy(next);
      if (enemy) {
        const init = initEnemyHealth(enemy);
        enemyHealth = init.health;
        enemyMaxHealth = init.maxHealth;
        tension = clampTension(tension + 12);
      }
    } else if (next === null && state.activeEncounter) {
      chronicle.push({ kind: "encounter", enemyId: state.activeEncounter, action: "depart" });
      enemyHealth = null;
      enemyMaxHealth = null;
    }
    activeEncounter = next;
  }

  if (result.allyId !== undefined) {
    const next =
      result.allyId === null ? null : sanitizeAllyId(result.allyId, state.scenarioId);
    if (next && next !== state.activeAlly) {
      chronicle.push({ kind: "ally", allyId: next, action: "appear" });
      if (!metAllies.includes(next)) {
        metAllies = [...metAllies, next];
      }
      const bonus = getAllyBonus(next);
      if (bonus.faithOnAppear) {
        const before = faith;
        faith = clampFaith(faith + bonus.faithOnAppear);
        chronicle.push({
          kind: "faith",
          delta: faith - before,
          newValue: faith,
        });
      }
      if (bonus.healthOnAppear) {
        const h = applyHealthDelta(
          { ...state, health, maxHealth, ended, reflection, faith },
          bonus.healthOnAppear,
          chronicle
        );
        health = h.health;
        maxHealth = h.maxHealth;
        chronicle = h.chronicle;
        if (h.ended) {
          ended = true;
          reflection = h.reflection;
        }
      }
      if (bonus.tensionOnAppear) {
        const before = tension;
        tension = clampTension(tension + bonus.tensionOnAppear);
        chronicle.push({ kind: "tension", delta: tension - before, newValue: tension });
      }
    } else if (next === null && state.activeAlly) {
      chronicle.push({ kind: "ally", allyId: state.activeAlly, action: "depart" });
    }
    activeAlly = next;
  }

  return {
    ...state,
    location,
    faith,
    health,
    maxHealth,
    turn: state.turn + 1,
    inventory,
    flags,
    chronicle,
    history,
    choices,
    ended,
    reflection: ended ? reflection : null,
    scriptures: trackScripture(state.scriptures, result.scriptureNote),
    locations: trackLocation(state.locations, location),
    milestones,
    questLog,
    xp,
    level,
    virtues,
    activeEncounter,
    encounteredEnemies,
    defeatedEnemies,
    enemyHealth,
    enemyMaxHealth,
    tension,
    chapterTitle,
    ultimateBuff,
    activeAlly,
    metAllies,
  };
}

export function findChoice(state: AdventureSaveState, choiceId: string): AdventureChoice | null {
  return state.choices.find((c) => c.id === choiceId) ?? null;
}

export function normalizeState(raw: Partial<AdventureSaveState>): AdventureSaveState {
  const archetypeId = (raw.archetypeId ?? "pilgrim") as ArchetypeId;
  const level = raw.level ?? levelFromXp(raw.xp ?? 0);
  const maxHealth = raw.maxHealth ?? maxHealthFor(archetypeId, level);
  const health = raw.health ?? maxHealth;
  return {
    ...raw,
    scriptures: raw.scriptures ?? [],
    locations: raw.locations ?? (raw.location ? [raw.location] : []),
    milestones: raw.milestones ?? [],
    itemUseTurn: raw.itemUseTurn ?? -1,
    prayedFree: raw.prayedFree ?? false,
    archetypeId,
    virtues: raw.virtues ?? createVirtues(archetypeId),
    xp: raw.xp ?? 0,
    level,
    health: clampHealth(health, maxHealth),
    maxHealth,
    restsUsed: raw.restsUsed ?? 0,
    questLog: raw.questLog ?? [],
    inspirationUsed: raw.inspirationUsed ?? false,
    activeEncounter: (raw.activeEncounter as EnemyId | null) ?? null,
    encounteredEnemies: (raw.encounteredEnemies as EnemyId[]) ?? [],
    defeatedEnemies: (raw.defeatedEnemies as EnemyId[]) ?? [],
    enemyHealth: raw.enemyHealth ?? null,
    enemyMaxHealth: raw.enemyMaxHealth ?? null,
    tension: raw.tension ?? DEFAULT_TENSION,
    chapterTitle: raw.chapterTitle ?? null,
    ultimateUsed: raw.ultimateUsed ?? false,
    ultimateBuff: (raw.ultimateBuff as UltimateBuff | null) ?? null,
    activeAlly: (raw.activeAlly as AllyId | null) ?? null,
    metAllies: (raw.metAllies as AllyId[]) ?? [],
  } as AdventureSaveState;
}

export function validateState(raw: unknown): AdventureSaveState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<AdventureSaveState>;
  if (!s.scenarioId || !getAdventureScenario(s.scenarioId)) return null;
  if (s.locale !== "sv" && s.locale !== "en") return null;
  if (typeof s.location !== "string") return null;
  if (typeof s.faith !== "number") return null;
  if (!Array.isArray(s.inventory)) return null;
  if (!Array.isArray(s.chronicle)) return null;
  if (!Array.isArray(s.history)) return null;
  if (!Array.isArray(s.choices)) return null;
  return normalizeState(s);
}

export function faithLabel(faith: number, locale: Locale): string {
  if (faith >= 75) return locale === "sv" ? "Stark tro" : "Strong faith";
  if (faith >= 50) return locale === "sv" ? "Växande tro" : "Growing faith";
  if (faith >= 25) return locale === "sv" ? "Vacklande tro" : "Wavering faith";
  return locale === "sv" ? "Tungt hjärta" : "Heavy heart";
}

export const TONE_EMOJI: Record<ChoiceTone, string> = {
  faith: "✝️",
  wisdom: "📜",
  courage: "🔥",
  mercy: "💛",
};
