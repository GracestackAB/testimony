import type { Locale } from "@/lib/i18n/types";

export type VirtueId = "wisdom" | "courage" | "compassion" | "steadfastness";

export type Virtues = Record<VirtueId, number>;

export type ArchetypeId = "prophet" | "pilgrim" | "guardian" | "servant";

export type SkillCheck = {
  virtue: VirtueId;
  dc: number;
};

export type ArchetypeDef = {
  id: ArchetypeId;
  emoji: string;
  nameSv: string;
  nameEn: string;
  descSv: string;
  descEn: string;
  bonuses: Partial<Virtues>;
  /** Primär dygd för inspiration (+2 på slag). */
  primaryVirtue: VirtueId;
};

const BASE_VIRTUE = 10;
const MIN_VIRTUE = 6;
const MAX_VIRTUE = 18;

export const ARCHETYPES: ArchetypeDef[] = [
  {
    id: "prophet",
    emoji: "📜",
    nameSv: "Profet",
    nameEn: "Prophet",
    descSv: "Ord och vishet vägleder dig — du hör Herrens röst i Skriften.",
    descEn: "Word and wisdom guide you — you hear the Lord's voice in Scripture.",
    bonuses: { wisdom: 2, compassion: 1 },
    primaryVirtue: "wisdom",
  },
  {
    id: "pilgrim",
    emoji: "🥾",
    nameSv: "Pilgrim",
    nameEn: "Pilgrim",
    descSv: "Långsamma steg, trofast väg — du viker inte från stigen.",
    descEn: "Slow steps, faithful road — you do not turn from the path.",
    bonuses: { steadfastness: 2, wisdom: 1 },
    primaryVirtue: "steadfastness",
  },
  {
    id: "guardian",
    emoji: "🛡️",
    nameSv: "Väktare",
    nameEn: "Guardian",
    descSv: "Mod att stå kvar när andra flyr — du går främst i fara.",
    descEn: "Courage to stand when others flee — you go first into danger.",
    bonuses: { courage: 2, steadfastness: 1 },
    primaryVirtue: "courage",
  },
  {
    id: "servant",
    emoji: "💛",
    nameSv: "Tjänare",
    nameEn: "Servant",
    descSv: "Barmhärtighet i handling — du ser den som andra går förbi.",
    descEn: "Mercy in action — you see the one others walk past.",
    bonuses: { compassion: 2, courage: 1 },
    primaryVirtue: "compassion",
  },
];

const ARCHETYPE_MAP = new Map(ARCHETYPES.map((a) => [a.id, a]));

export function getArchetype(id: ArchetypeId): ArchetypeDef | undefined {
  return ARCHETYPE_MAP.get(id);
}

export function isArchetypeId(id: string): id is ArchetypeId {
  return ARCHETYPE_MAP.has(id as ArchetypeId);
}

export function createVirtues(archetypeId: ArchetypeId): Virtues {
  const arch = getArchetype(archetypeId)!;
  const virtues: Virtues = {
    wisdom: BASE_VIRTUE,
    courage: BASE_VIRTUE,
    compassion: BASE_VIRTUE,
    steadfastness: BASE_VIRTUE,
  };
  for (const [k, v] of Object.entries(arch.bonuses) as [VirtueId, number][]) {
    virtues[k] = clampVirtue(virtues[k] + v);
  }
  return virtues;
}

export function clampVirtue(n: number): number {
  return Math.max(MIN_VIRTUE, Math.min(MAX_VIRTUE, n));
}

/** D&D-style modifier från dygd (10–11 → +0). */
export function virtueModifier(virtue: number): number {
  return Math.floor((virtue - 10) / 2);
}

export function virtueLabel(id: VirtueId, locale: Locale): string {
  const labels: Record<VirtueId, Record<Locale, string>> = {
    wisdom: { sv: "Vishet", en: "Wisdom" },
    courage: { sv: "Mod", en: "Courage" },
    compassion: { sv: "Barmhärtighet", en: "Compassion" },
    steadfastness: { sv: "Trofasthet", en: "Steadfastness" },
  };
  return labels[id][locale];
}

export function archetypeName(arch: ArchetypeDef, locale: Locale): string {
  return locale === "en" ? arch.nameEn : arch.nameSv;
}

export function archetypeDesc(arch: ArchetypeDef, locale: Locale): string {
  return locale === "en" ? arch.descEn : arch.descSv;
}

export type RollResult = {
  virtue: VirtueId;
  d20: number;
  d20Second?: number;
  modifier: number;
  total: number;
  dc: number;
  success: boolean;
  inspiration: boolean;
  critical: "nat20" | "nat1" | null;
};

export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

export function resolveSkillCheck(input: {
  virtues: Virtues;
  check: SkillCheck;
  useInspiration: boolean;
  archetypeId: ArchetypeId;
}): RollResult {
  const mod = virtueModifier(input.virtues[input.check.virtue]);
  let inspiration = false;
  let d20 = rollD20();
  let d20Second: number | undefined;

  if (input.useInspiration) {
    inspiration = true;
    d20Second = rollD20();
    d20 = Math.max(d20, d20Second);
    const arch = getArchetype(input.archetypeId);
    const extra = arch?.primaryVirtue === input.check.virtue ? 2 : 0;
    const total = d20 + mod + extra;
    const critical = d20 === 20 ? "nat20" : d20 === 1 ? "nat1" : null;
    return {
      virtue: input.check.virtue,
      d20,
      d20Second,
      modifier: mod + extra,
      total,
      dc: input.check.dc,
      success: total >= input.check.dc || critical === "nat20",
      inspiration: true,
      critical,
    };
  }

  const critical = d20 === 20 ? "nat20" : d20 === 1 ? "nat1" : null;
  const total = d20 + mod;
  const success =
    critical === "nat20" ? true : critical === "nat1" ? false : total >= input.check.dc;
  return {
    virtue: input.check.virtue,
    d20,
    modifier: mod,
    total,
    dc: input.check.dc,
    success,
    inspiration,
    critical,
  };
}

export function sanitizeSkillCheck(raw: unknown): SkillCheck | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SkillCheck>;
  const virtues: VirtueId[] = ["wisdom", "courage", "compassion", "steadfastness"];
  if (!r.virtue || !virtues.includes(r.virtue as VirtueId)) return null;
  const dc = typeof r.dc === "number" ? Math.round(r.dc) : 12;
  return { virtue: r.virtue as VirtueId, dc: Math.max(8, Math.min(18, dc)) };
}

export const XP_PER_CHECK = 10;
export const XP_LEVEL_2 = 30;
export const XP_LEVEL_3 = 65;

export function levelFromXp(xp: number): number {
  if (xp >= XP_LEVEL_3) return 3;
  if (xp >= XP_LEVEL_2) return 2;
  return 1;
}

export function applyXpGain(xp: number, success: boolean): number {
  return xp + (success ? XP_PER_CHECK : 3);
}

export function levelUpVirtues(
  virtues: Virtues,
  archetypeId: ArchetypeId,
  newLevel: number,
  oldLevel: number
): Virtues {
  if (newLevel <= oldLevel) return virtues;
  const arch = getArchetype(archetypeId);
  if (!arch) return virtues;
  const next = { ...virtues };
  next[arch.primaryVirtue] = clampVirtue(next[arch.primaryVirtue] + 1);
  if (newLevel >= 3) {
    const secondary: VirtueId =
      arch.primaryVirtue === "wisdom"
        ? "compassion"
        : arch.primaryVirtue === "courage"
          ? "steadfastness"
          : "wisdom";
    next[secondary] = clampVirtue(next[secondary] + 1);
  }
  return next;
}

export const VIRTUE_EMOJI: Record<VirtueId, string> = {
  wisdom: "📜",
  courage: "🔥",
  compassion: "💛",
  steadfastness: "✝️",
};
