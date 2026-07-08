import type { AdventureScenarioId } from "./scenarios";

export type AmbienceProfile = {
  id: AdventureScenarioId;
  /** Basfrekvens för drone (Hz). */
  baseFreq: number;
  /** Brusvolym 0–1. */
  noiseGain: number;
  /** LFO-hastighet för vind. */
  lfoRate: number;
};

export const AMBIENCE_PROFILES: Record<AdventureScenarioId, AmbienceProfile> = {
  elijah_carmel: { id: "elijah_carmel", baseFreq: 110, noiseGain: 0.04, lfoRate: 0.15 },
  esther_palace: { id: "esther_palace", baseFreq: 140, noiseGain: 0.03, lfoRate: 0.08 },
  joseph_pit: { id: "joseph_pit", baseFreq: 90, noiseGain: 0.05, lfoRate: 0.12 },
  cleopas_road: { id: "cleopas_road", baseFreq: 120, noiseGain: 0.035, lfoRate: 0.1 },
};

export const AMBIENCE_STORAGE_KEY = "bibel-aventyr-ambience";

export function readAmbienceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AMBIENCE_STORAGE_KEY) !== "off";
}

export function writeAmbienceEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AMBIENCE_STORAGE_KEY, on ? "on" : "off");
}
