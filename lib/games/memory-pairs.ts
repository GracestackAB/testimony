import {
  getPassagePool,
  shuffle,
  truncateVerse,
} from "@/lib/games/bible-quiz";
import type { Locale } from "@/lib/i18n/types";

export type MemoryCard = {
  id: string;
  pairId: string;
  kind: "reference" | "verse";
  label: string;
  reference: string;
};

export type MemoryBoard = {
  cards: MemoryCard[];
  pairCount: number;
};

/**
 * Build a memory board: match reference ↔ verse opening.
 */
export function buildMemoryBoard(
  pairCount = 6,
  locale: Locale = "sv",
  rng: () => number = Math.random
): MemoryBoard {
  const pool = getPassagePool(locale);
  const count = Math.min(pairCount, pool.length);
  const passages = shuffle(pool, rng).slice(0, count);

  const cards: MemoryCard[] = [];
  passages.forEach((p, i) => {
    const pairId = `pair-${i}-${p.reference}`;
    cards.push({
      id: `${pairId}-ref`,
      pairId,
      kind: "reference",
      label: p.reference,
      reference: p.reference,
    });
    cards.push({
      id: `${pairId}-verse`,
      pairId,
      kind: "verse",
      label: truncateVerse(p.content, 72),
      reference: p.reference,
    });
  });

  return { cards: shuffle(cards, rng), pairCount: count };
}

export function cardsMatch(a: MemoryCard, b: MemoryCard): boolean {
  return a.pairId === b.pairId && a.id !== b.id;
}

export function isBoardComplete(matchedPairIds: Set<string>, pairCount: number): boolean {
  return matchedPairIds.size >= pairCount;
}
