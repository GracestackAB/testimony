import type { Locale } from "@/lib/i18n/types";
import type { AdventureSaveState } from "./state";

export type ItemUseEffect = {
  faithDelta: number;
  healthDelta?: number;
  whisperSv: string;
  whisperEn: string;
  scriptureRef?: string;
  consumes: boolean;
  milestoneId?: string;
};

/** Föremål som kan användas från packningen (mellan turer). */
export const ITEM_USE_EFFECTS: Record<string, ItemUseEffect> = {
  waterskin: {
    faithDelta: 4,
    healthDelta: 6,
    whisperSv: "Svalt vatten svalkar din törst — och du minns att Herren ledde sitt folk genom öknen.",
    whisperEn: "Cool water quenches your thirst — and you remember the Lord led His people through the wilderness.",
    scriptureRef: "5 Mos 8:15",
    consumes: true,
  },
  scripture_scroll: {
    faithDelta: 6,
    whisperSv: "Du rullar upp pergamentet. Ett ord faller som dagg: »Var inte rädd, för jag är med dig.«",
    whisperEn: "You unroll the parchment. A word falls like dew: \"Do not fear, for I am with you.\"",
    scriptureRef: "Jes 41:10",
    consumes: false,
    milestoneId: "scripture_light",
  },
  bread: {
    faithDelta: 5,
    healthDelta: 8,
    whisperSv: "Brödet mättar — daglig gåva, påminnelse om mannat i öknen.",
    whisperEn: "The bread satisfies — daily gift, a reminder of manna in the wilderness.",
    scriptureRef: "Matt 6:11",
    consumes: true,
    milestoneId: "shared_bread",
  },
  myrrh: {
    faithDelta: 7,
    healthDelta: 5,
    whisperSv: "Doften av myrra fyller luften — sorg och hopp vävda i ett enda ögonblick.",
    whisperEn: "The scent of myrrh fills the air — sorrow and hope woven in a single moment.",
    scriptureRef: "Joh 19:39",
    consumes: true,
  },
  oil_lamp: {
    faithDelta: 5,
    whisperSv: "Lågan flackar men går inte ut. Mörkret har inte makten över detta ljus.",
    whisperEn: "The flame flickers but does not go out. Darkness has no power over this light.",
    scriptureRef: "Ps 119:105",
    consumes: false,
  },
  harp: {
    faithDelta: 8,
    whisperSv: "En psalm stiger från dina strängar — David sjöng så i grottan, och Herren hörde.",
    whisperEn: "A psalm rises from your strings — David sang thus in the cave, and the Lord heard.",
    scriptureRef: "Ps 42:8",
    consumes: false,
    milestoneId: "prayerful_heart",
  },
};

export function canUseItem(state: AdventureSaveState, itemId: string): boolean {
  if (state.ended || !state.inventory.includes(itemId)) return false;
  if (!ITEM_USE_EFFECTS[itemId]) return false;
  return state.itemUseTurn !== state.turn;
}

export function whisperText(effect: ItemUseEffect, locale: Locale): string {
  return locale === "en" ? effect.whisperEn : effect.whisperSv;
}
