import type { Locale } from "@/lib/i18n/types";

export type AdventureItemDef = {
  id: string;
  emoji: string;
  nameSv: string;
  nameEn: string;
  descSv: string;
  descEn: string;
  consumable?: boolean;
};

export const ADVENTURE_ITEMS: Record<string, AdventureItemDef> = {
  travel_cloak: {
    id: "travel_cloak",
    emoji: "🧥",
    nameSv: "Resemantel",
    nameEn: "Travel cloak",
    descSv: "Skydd mot nattens kyla och ökenvinden.",
    descEn: "Protection from night chill and desert wind.",
  },
  scripture_scroll: {
    id: "scripture_scroll",
    emoji: "📜",
    nameSv: "Skriftrulle",
    nameEn: "Scripture scroll",
    descSv: "Ord från profeterna — viskar när du tvivlar.",
    descEn: "Words of the prophets — whispers when you doubt.",
  },
  waterskin: {
    id: "waterskin",
    emoji: "💧",
    nameSv: "Vinsäck",
    nameEn: "Waterskin",
    descSv: "Svalt vatten för en törstig resa.",
    descEn: "Cool water for a thirsty journey.",
    consumable: true,
  },
  oil_lamp: {
    id: "oil_lamp",
    emoji: "🪔",
    nameSv: "Oljelampa",
    nameEn: "Oil lamp",
    descSv: "Ljus när mörkret faller över stigen.",
    descEn: "Light when darkness falls on the path.",
  },
  bread: {
    id: "bread",
    emoji: "🍞",
    nameSv: "Bröd",
    nameEn: "Bread",
    descSv: "Dagligt bröd — dela eller spara.",
    descEn: "Daily bread — share or save.",
    consumable: true,
  },
  staff: {
    id: "staff",
    emoji: "🪵",
    nameSv: "Vandringsstav",
    nameEn: "Walking staff",
    descSv: "Stöd på brant stig och tecken på auktoritet.",
    descEn: "Support on steep paths and a sign of authority.",
  },
  seal_ring: {
    id: "seal_ring",
    emoji: "💍",
    nameSv: "Signetring",
    nameEn: "Signet ring",
    descSv: "Kunglig auktoritet i din hand.",
    descEn: "Royal authority in your hand.",
  },
  myrrh: {
    id: "myrrh",
    emoji: "🌿",
    nameSv: "Myrra",
    nameEn: "Myrrh",
    descSv: "Värdigt salva — doft av sorg och hopp.",
    descEn: "Costly ointment — scent of sorrow and hope.",
    consumable: true,
  },
  harp: {
    id: "harp",
    emoji: "🎵",
    nameSv: "Liten harpa",
    nameEn: "Small harp",
    descSv: "Psalmer som stillar oroliga hjärtan.",
    descEn: "Psalms that quiet anxious hearts.",
  },
};

export function getItem(id: string): AdventureItemDef | undefined {
  return ADVENTURE_ITEMS[id];
}

export function itemName(item: AdventureItemDef, locale: Locale): string {
  return locale === "en" ? item.nameEn : item.nameSv;
}

export function itemDesc(item: AdventureItemDef, locale: Locale): string {
  return locale === "en" ? item.descEn : item.descSv;
}
