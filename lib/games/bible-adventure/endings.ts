import type { Locale } from "@/lib/i18n/types";
import type { AdventureSaveState } from "./state";

export type EndingRank = {
  id: string;
  emoji: string;
  titleSv: string;
  titleEn: string;
  summarySv: string;
  summaryEn: string;
};

const RANKS: EndingRank[] = [
  {
    id: "faithful_witness",
    emoji: "👑",
    titleSv: "Trofast vittne",
    titleEn: "Faithful witness",
    summarySv: "Ditt hjärta höll fast vid Herren genom prövningarna.",
    summaryEn: "Your heart held fast to the Lord through the trials.",
  },
  {
    id: "steadfast_soul",
    emoji: "🕊️",
    titleSv: "Stadig själ",
    titleEn: "Steadfast soul",
    summarySv: "Du vacklade ibland men vände alltid blicken tillbaka.",
    summaryEn: "You wavered at times but always turned your gaze back.",
  },
  {
    id: "seeking_pilgrim",
    emoji: "🌿",
    titleSv: "Sökande pilgrim",
    titleEn: "Seeking pilgrim",
    summarySv: "Vägen var tung, men du fortsatte gå — och det räknas.",
    summaryEn: "The road was heavy, but you kept walking — and that matters.",
  },
  {
    id: "heavy_yet_hope",
    emoji: "🌅",
    titleSv: "Tungt hjärta, levande hopp",
    titleEn: "Heavy heart, living hope",
    summarySv: "Mörkret var nära — men gryningen är Herrens löfte.",
    summaryEn: "Darkness was near — yet dawn is the Lord's promise.",
  },
];

export function computeEndingRank(state: AdventureSaveState): EndingRank {
  const f = state.faith;
  const hpRatio = state.maxHealth > 0 ? state.health / state.maxHealth : 1;
  if (f >= 75 && hpRatio >= 0.4) return RANKS[0]!;
  if (f >= 55 && hpRatio >= 0.25) return RANKS[1]!;
  if (f >= 35 || hpRatio >= 0.15) return RANKS[2]!;
  return RANKS[3]!;
}

export function rankTitle(rank: EndingRank, locale: Locale): string {
  return locale === "en" ? rank.titleEn : rank.titleSv;
}

export function rankSummary(rank: EndingRank, locale: Locale): string {
  return locale === "en" ? rank.summaryEn : rank.summarySv;
}

export function buildChronicleExport(state: AdventureSaveState, locale: Locale): string {
  const rank = computeEndingRank(state);
  const lines: string[] = [
    locale === "sv" ? "📜 Bibel-krönika" : "📜 Bible Chronicle",
    `${rank.emoji} ${rankTitle(rank, locale)}`,
    "",
  ];

  for (const entry of state.chronicle) {
    if (entry.kind === "narrative") {
      lines.push(entry.text);
      if (entry.scriptureNote) lines.push(`📖 ${entry.scriptureNote}`);
      lines.push("");
    } else if (entry.kind === "choice") {
      lines.push(locale === "sv" ? `→ ${entry.label}` : `→ ${entry.label}`);
    } else if (entry.kind === "whisper") {
      lines.push(`✨ ${entry.text}`);
      if (entry.scriptureRef) lines.push(`📖 ${entry.scriptureRef}`);
    }
  }

  if (state.reflection) {
    lines.push("");
    lines.push(locale === "sv" ? "Till eftertanke:" : "For reflection:");
    lines.push(state.reflection);
  }

  lines.push("", "testimony.se/spel/bibel-aventyr");
  return lines.join("\n");
}
