import { shuffle } from "@/lib/games/kids-bible";
import type { Locale } from "@/lib/i18n/types";

export type KidsMemoryPair = {
  id: string;
  personEmoji: string;
  storyEmoji: string;
  personSv: string;
  personEn: string;
  storySv: string;
  storyEn: string;
  funFactSv: string;
  funFactEn: string;
};

export type KidsMemoryCard = {
  id: string;
  pairId: string;
  kind: "person" | "story";
  emoji: string;
  label: string;
};

export type KidsMemoryBoard = {
  cards: KidsMemoryCard[];
  pairCount: number;
  pairs: KidsMemoryPair[];
};

/** Person ↔ berättelse — enkla visuella par för barn 4+. */
export const KIDS_MEMORY_PAIRS: KidsMemoryPair[] = [
  {
    id: "noah",
    personEmoji: "🧔",
    storyEmoji: "🚢",
    personSv: "Noa",
    personEn: "Noah",
    storySv: "Arken",
    storyEn: "The ark",
    funFactSv: "Noa byggde arken och Gud lovade med en regnbåge!",
    funFactEn: "Noah built the ark and God promised with a rainbow!",
  },
  {
    id: "david",
    personEmoji: "👦",
    storyEmoji: "🪨",
    personSv: "David",
    personEn: "David",
    storySv: "Slungan",
    storyEn: "The sling",
    funFactSv: "Liten David besegrade jätten Goliat med en sten!",
    funFactEn: "Young David defeated the giant Goliath with a stone!",
  },
  {
    id: "daniel",
    personEmoji: "🙏",
    storyEmoji: "🦁",
    personSv: "Daniel",
    personEn: "Daniel",
    storySv: "Lejonen",
    storyEn: "The lions",
    funFactSv: "Gud höll lejonen lugna hela natten!",
    funFactEn: "God kept the lions calm all night long!",
  },
  {
    id: "jonah",
    personEmoji: "🧑",
    storyEmoji: "🐋",
    personSv: "Jona",
    personEn: "Jonah",
    storySv: "Fisken",
    storyEn: "The fish",
    funFactSv: "Jona bad i den stora fisken — och Gud hörde honom.",
    funFactEn: "Jonah prayed inside the big fish — and God heard him.",
  },
  {
    id: "jesus",
    personEmoji: "👶",
    storyEmoji: "⭐",
    personSv: "Jesus",
    personEn: "Jesus",
    storySv: "Stjärnan",
    storyEn: "The star",
    funFactSv: "En stjärna ledde de visa till baby Jesus i Betlehem.",
    funFactEn: "A star led the wise men to baby Jesus in Bethlehem.",
  },
  {
    id: "moses",
    personEmoji: "🧔",
    storyEmoji: "🌊",
    personSv: "Mose",
    personEn: "Moses",
    storySv: "Havet",
    storyEn: "The sea",
    funFactSv: "Gud delade Röda havet så folket kunde gå över!",
    funFactEn: "God parted the Red Sea so the people could walk across!",
  },
  {
    id: "joseph",
    personEmoji: "🧥",
    storyEmoji: "🌈",
    personSv: "Josef",
    personEn: "Joseph",
    storySv: "Färggrann kåpa",
    storyEn: "Colorful coat",
    funFactSv: "Josef hade en vacker kåpa — Gud var med honom i Egypten.",
    funFactEn: "Joseph had a beautiful coat — God was with him in Egypt.",
  },
  {
    id: "shepherd",
    personEmoji: "🧑‍🌾",
    storyEmoji: "🐑",
    personSv: "Herden",
    personEn: "The shepherd",
    storySv: "Fåret",
    storyEn: "The sheep",
    funFactSv: "Jesus är den gode herden som älskar sina får.",
    funFactEn: "Jesus is the good shepherd who loves his sheep.",
  },
];

export function personLabel(pair: KidsMemoryPair, locale: Locale): string {
  return locale === "en" ? pair.personEn : pair.personSv;
}

export function storyLabel(pair: KidsMemoryPair, locale: Locale): string {
  return locale === "en" ? pair.storyEn : pair.storySv;
}

export function funFact(pair: KidsMemoryPair, locale: Locale): string {
  return locale === "en" ? pair.funFactEn : pair.funFactSv;
}

export function findPair(pairs: KidsMemoryPair[], pairId: string): KidsMemoryPair | undefined {
  return pairs.find((p) => p.id === pairId);
}

/**
 * Build a kids memory board: match person ↔ story symbol.
 */
export function buildKidsMemoryBoard(
  pairCount = 5,
  locale: Locale = "sv",
  rng: () => number = Math.random
): KidsMemoryBoard {
  const count = Math.min(pairCount, KIDS_MEMORY_PAIRS.length);
  const pairs = shuffle(KIDS_MEMORY_PAIRS, rng).slice(0, count);

  const cards: KidsMemoryCard[] = [];
  for (const pair of pairs) {
    cards.push({
      id: `${pair.id}-person`,
      pairId: pair.id,
      kind: "person",
      emoji: pair.personEmoji,
      label: personLabel(pair, locale),
    });
    cards.push({
      id: `${pair.id}-story`,
      pairId: pair.id,
      kind: "story",
      emoji: pair.storyEmoji,
      label: storyLabel(pair, locale),
    });
  }

  return { cards: shuffle(cards, rng), pairCount: count, pairs };
}

export function kidsMemoryCardsMatch(a: KidsMemoryCard, b: KidsMemoryCard): boolean {
  return a.pairId === b.pairId && a.id !== b.id;
}

export function isKidsMemoryComplete(matchedPairIds: Set<string>, pairCount: number): boolean {
  return matchedPairIds.size >= pairCount;
}
