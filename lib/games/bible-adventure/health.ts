import type { Locale } from "@/lib/i18n/types";
import type { ArchetypeId } from "./character";

/** Bas-HP vid nivå 1 (D&D-känsla). */
export const BASE_MAX_HEALTH = 24;
export const LEVEL_HEALTH_BONUS = 4;
export const MAX_REST_COUNT = 2;
export const REST_HEAL_RATIO = 0.4;
export const LEVEL_HEALTH_ON_LEVELUP = 4;

const ARCHETYPE_HEALTH: Record<ArchetypeId, number> = {
  guardian: 6,
  pilgrim: 4,
  servant: 2,
  prophet: 0,
};

export function maxHealthFor(archetypeId: ArchetypeId, level: number): number {
  const lvl = Math.max(1, Math.min(3, level));
  return BASE_MAX_HEALTH + ARCHETYPE_HEALTH[archetypeId] + (lvl - 1) * LEVEL_HEALTH_BONUS;
}

export function clampHealth(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function healthLabel(health: number, max: number, locale: Locale): string {
  const ratio = max > 0 ? health / max : 0;
  if (ratio >= 0.75) return locale === "sv" ? "Frisk" : "Healthy";
  if (ratio >= 0.5) return locale === "sv" ? "Trött" : "Weary";
  if (ratio >= 0.25) return locale === "sv" ? "Sårad" : "Wounded";
  if (health > 0) return locale === "sv" ? "Kritisk" : "Critical";
  return locale === "sv" ? "Utmattad" : "Exhausted";
}

/** Skada vid misslyckat tärningsprov (skala med hur mycket man missade). */
export function damageFromFailedCheck(total: number, dc: number): number {
  const miss = dc - total;
  if (miss <= 0) return 0;
  return Math.min(10, Math.max(2, Math.ceil(miss / 2)));
}

export function restHealAmount(maxHealth: number): number {
  return Math.max(4, Math.round(maxHealth * REST_HEAL_RATIO));
}

export function clampHealthDelta(raw: unknown): number {
  const n = typeof raw === "number" ? raw : 0;
  return Math.max(-15, Math.min(12, Math.round(n)));
}
