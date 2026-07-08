import type { Locale } from "@/lib/i18n/types";

export type MilestoneDef = {
  id: string;
  emoji: string;
  nameSv: string;
  nameEn: string;
  descSv: string;
  descEn: string;
};

/** Milstolpar AI eller spelmotor kan tilldela — id måste finnas här. */
export const ADVENTURE_MILESTONES: Record<string, MilestoneDef> = {
  prayerful_heart: {
    id: "prayerful_heart",
    emoji: "🙏",
    nameSv: "Bönens stund",
    nameEn: "Moment of prayer",
    descSv: "Du vände dig till Herren i tysthet.",
    descEn: "You turned to the Lord in quietness.",
  },
  scripture_light: {
    id: "scripture_light",
    emoji: "📖",
    nameSv: "Skriftens ljus",
    nameEn: "Light of Scripture",
    descSv: "Ett ord från profeterna stärkte din väg.",
    descEn: "A word from the prophets strengthened your path.",
  },
  courage_shown: {
    id: "courage_shown",
    emoji: "⚔️",
    nameSv: "Mod bevisat",
    nameEn: "Courage shown",
    descSv: "Du valde att stå fast när andra vacklade.",
    descEn: "You chose to stand firm when others wavered.",
  },
  mercy_given: {
    id: "mercy_given",
    emoji: "💛",
    nameSv: "Barmhärtighet",
    nameEn: "Mercy given",
    descSv: "Du visade nåd där du kunde ha dragit dig undan.",
    descEn: "You showed grace where you could have turned away.",
  },
  trusted_providence: {
    id: "trusted_providence",
    emoji: "✨",
    nameSv: "Förtröstan",
    nameEn: "Trust in providence",
    descSv: "Du litade på Guds osynliga hand.",
    descEn: "You trusted God's hidden hand.",
  },
  shared_bread: {
    id: "shared_bread",
    emoji: "🍞",
    nameSv: "Delat bröd",
    nameEn: "Bread shared",
    descSv: "Du delade det du hade med en annan.",
    descEn: "You shared what you had with another.",
  },
};

export function getMilestone(id: string): MilestoneDef | undefined {
  return ADVENTURE_MILESTONES[id];
}

export function milestoneName(m: MilestoneDef, locale: Locale): string {
  return locale === "en" ? m.nameEn : m.nameSv;
}

export function milestoneDesc(m: MilestoneDef, locale: Locale): string {
  return locale === "en" ? m.descEn : m.descSv;
}

export function isValidMilestoneId(id: string): boolean {
  return id in ADVENTURE_MILESTONES;
}
