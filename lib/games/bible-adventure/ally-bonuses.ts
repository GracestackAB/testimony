import type { Locale } from "@/lib/i18n/types";
import type { VirtueId } from "./character";
import type { AllyId } from "./allies";

export type AllyBonus = {
  /** Lägre SV för denna dygd medan allierad är aktiv. */
  skillVirtue?: VirtueId;
  dcReduction: number;
  faithOnAppear?: number;
  healthOnAppear?: number;
  tensionOnAppear?: number;
  descSv: string;
  descEn: string;
};

export const ALLY_BONUSES: Record<AllyId, AllyBonus> = {
  obadiah: {
    skillVirtue: "wisdom",
    dcReduction: 2,
    tensionOnAppear: -10,
    descSv: "Vishetsprov SV −2 · spänning −10 vid möte",
    descEn: "Wisdom checks DC −2 · tension −10 on meeting",
  },
  widow_zarephath: {
    dcReduction: 0,
    healthOnAppear: 8,
    faithOnAppear: 3,
    descSv: "+8 livskraft och +3 tro när hon delar sitt bröd",
    descEn: "+8 vitality and +3 faith when she shares her bread",
  },
  mordecai: {
    skillVirtue: "compassion",
    dcReduction: 2,
    faithOnAppear: 4,
    descSv: "Barmhärtighetsprov SV −2 · +4 tro",
    descEn: "Compassion checks DC −2 · +4 faith",
  },
  hagai: {
    skillVirtue: "wisdom",
    dcReduction: 2,
    tensionOnAppear: -8,
    descSv: "Vishetsprov SV −2 · spänning −8",
    descEn: "Wisdom checks DC −2 · tension −8",
  },
  cupbearer: {
    dcReduction: 0,
    healthOnAppear: 6,
    tensionOnAppear: -5,
    descSv: "+6 livskraft · hopp i fängelset",
    descEn: "+6 vitality · hope in prison",
  },
  reuben: {
    skillVirtue: "steadfastness",
    dcReduction: 2,
    faithOnAppear: 2,
    descSv: "Trofasthetsprov SV −2 · +2 tro",
    descEn: "Steadfastness checks DC −2 · +2 faith",
  },
  cleopas: {
    skillVirtue: "steadfastness",
    dcReduction: 2,
    tensionOnAppear: -12,
    descSv: "Trofasthetsprov SV −2 · sorgen lättar",
    descEn: "Steadfastness checks DC −2 · grief eases",
  },
  companion_road: {
    skillVirtue: "compassion",
    dcReduction: 2,
    faithOnAppear: 5,
    descSv: "Barmhärtighetsprov SV −2 · +5 tro",
    descEn: "Compassion checks DC −2 · +5 faith",
  },
};

export function getAllyBonus(allyId: AllyId): AllyBonus {
  return ALLY_BONUSES[allyId];
}

export function allyBonusDesc(bonus: AllyBonus, locale: Locale): string {
  return locale === "en" ? bonus.descEn : bonus.descSv;
}

/** SV-reduktion från aktiv allierad för given dygd. */
export function allyDcReduction(allyId: AllyId | null, virtue: VirtueId): number {
  if (!allyId) return 0;
  const b = ALLY_BONUSES[allyId];
  if (!b.skillVirtue || b.skillVirtue !== virtue) return 0;
  return b.dcReduction;
}

export function applyAllyDcToCheck(
  allyId: AllyId | null,
  check: { virtue: VirtueId; dc: number }
): { virtue: VirtueId; dc: number } {
  const reduction = allyDcReduction(allyId, check.virtue);
  if (reduction <= 0) return check;
  return { ...check, dc: Math.max(8, check.dc - reduction) };
}
