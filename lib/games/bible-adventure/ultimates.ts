import type { Locale } from "@/lib/i18n/types";
import type { ArchetypeId } from "./character";
import type { AdventureSaveState } from "./state";

export type UltimateBuff = "wisdom_auto" | "damage_shield" | "mercy_strike";

export type UltimateDef = {
  id: ArchetypeId;
  emoji: string;
  nameSv: string;
  nameEn: string;
  descSv: string;
  descEn: string;
  /** Pilgrim: instant heal only (no buff). */
  buff: UltimateBuff | "instant_heal";
};

export const ULTIMATES: UltimateDef[] = [
  {
    id: "prophet",
    emoji: "✨",
    nameSv: "Himmelens ord",
    nameEn: "Word from heaven",
    descSv: "Ditt nästa vishetsprov lyckas automatiskt — Skriftens klarhet fyller dig.",
    descEn: "Your next wisdom check succeeds automatically — Scripture's clarity fills you.",
    buff: "wisdom_auto",
  },
  {
    id: "pilgrim",
    emoji: "🕊️",
    nameSv: "Vandringsfred",
    nameEn: "Pilgrim's peace",
    descSv: "Helar 40% livskraft och sänker spänningen — Herren ger vila åt de trötta.",
    descEn: "Heals 40% vitality and lowers tension — the Lord gives rest to the weary.",
    buff: "instant_heal",
  },
  {
    id: "guardian",
    emoji: "🛡️",
    nameSv: "Trons sköld",
    nameEn: "Shield of faith",
    descSv: "Nästa skada du tar ignoreras helt — du står fast som Karmels klippa.",
    descEn: "The next damage you take is completely negated — you stand firm as Carmel's rock.",
    buff: "damage_shield",
  },
  {
    id: "servant",
    emoji: "💛",
    nameSv: "Barmhärtighetens flod",
    nameEn: "Flood of mercy",
    descSv: "+15 tro; nästa lyckade slag mot fiende gör +8 extra skada.",
    descEn: "+15 faith; your next successful strike against a foe deals +8 extra damage.",
    buff: "mercy_strike",
  },
];

const MAP = new Map(ULTIMATES.map((u) => [u.id, u]));

export function getUltimate(archetypeId: ArchetypeId): UltimateDef {
  return MAP.get(archetypeId)!;
}

export function ultimateName(u: UltimateDef, locale: Locale): string {
  return locale === "en" ? u.nameEn : u.nameSv;
}

export function ultimateDesc(u: UltimateDef, locale: Locale): string {
  return locale === "en" ? u.descEn : u.descSv;
}

export function canUseUltimate(state: AdventureSaveState): boolean {
  return !state.ended && !state.ultimateUsed && state.health > 0;
}

export const PILGRIM_HEAL_RATIO = 0.4;
export const PILGRIM_TENSION_RELIEF = 22;
export const SERVANT_FAITH_BONUS = 15;
export const MERCY_STRIKE_BONUS = 8;
