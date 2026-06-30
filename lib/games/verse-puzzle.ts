import {
  getPassagePool,
  shuffle,
  type BiblePassage,
} from "@/lib/games/bible-quiz";
import type { Locale } from "@/lib/i18n/types";

export type PuzzleSegment =
  | { type: "text"; value: string }
  | { type: "blank"; slotIndex: number };

export type VersePuzzleRound = {
  id: string;
  reference: string;
  topic: string;
  segments: PuzzleSegment[];
  blanks: { slotIndex: number; word: string }[];
  wordBank: string[];
  fullText: string;
};

const STOPWORDS: Record<Locale, Set<string>> = {
  sv: new Set([
    "och", "att", "i", "en", "et", "den", "det", "som", "för", "inte", "på", "av", "med",
    "han", "hon", "de", "dig", "din", "ditt", "dina", "min", "mitt", "mina", "sig", "sin",
    "sitt", "sina", "var", "är", "var", "blev", "blir", "har", "hade", "till", "från",
    "om", "du", "vi", "ni", "dem", "deras", "hans", "hennes", "alla", "när", "då", "men",
    "eller", "utan", "under", "över", "vid", "ut", "in", "än", "så", "det", "denna", "detta",
  ]),
  en: new Set([
    "and", "the", "a", "an", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
    "did", "will", "would", "shall", "should", "may", "might", "must", "can", "could",
    "he", "she", "it", "they", "we", "you", "i", "me", "him", "her", "them", "us", "his",
    "hers", "its", "their", "our", "your", "my", "that", "this", "these", "those", "not",
    "but", "or", "as", "if", "then", "than", "so", "no", "nor", "all", "who", "whom",
  ]),
};

function tokenizeVerse(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function pickBlankIndices(tokens: string[], locale: Locale, maxBlanks: number, rng: () => number): number[] {
  const stop = STOPWORDS[locale];
  const candidates = tokens
    .map((word, index) => ({ word: word.replace(/[.,;:!?""''()]/g, ""), index, raw: word }))
    .filter(({ word }) => word.length >= 4 && !stop.has(word.toLowerCase()));

  if (candidates.length === 0) {
    const fallback = tokens
      .map((word, index) => ({ word, index }))
      .filter(({ word }) => word.length >= 3);
    return shuffle(fallback, rng)
      .slice(0, maxBlanks)
      .map((c) => c.index)
      .sort((a, b) => a - b);
  }

  const shuffled = shuffle(candidates, rng);
  const picked: number[] = [];
  for (const c of shuffled) {
    if (picked.length >= maxBlanks) break;
    if (picked.some((i) => Math.abs(i - c.index) <= 1)) continue;
    picked.push(c.index);
  }
  if (picked.length === 0) picked.push(shuffled[0].index);
  return picked.sort((a, b) => a - b);
}

function normalizeWord(word: string): string {
  return word.replace(/[.,;:!?""''()]/g, "").toLowerCase();
}

/**
 * Build one fill-in-the-blank puzzle from a passage.
 */
export function buildVersePuzzle(
  passage: BiblePassage,
  pool: BiblePassage[],
  locale: Locale,
  rng: () => number = Math.random
): VersePuzzleRound {
  const tokens = tokenizeVerse(passage.content);
  const blankCount = tokens.length >= 12 ? 2 : 1;
  const blankIndices = pickBlankIndices(tokens, locale, blankCount, rng);

  const blanks = blankIndices.map((index, slotIndex) => ({
    slotIndex,
    word: tokens[index].replace(/[.,;:!?""''()]+$/, ""),
  }));

  const segments: PuzzleSegment[] = [];
  let blankPtr = 0;
  tokens.forEach((token, i) => {
    if (blankIndices.includes(i)) {
      segments.push({ type: "blank", slotIndex: blankPtr });
      blankPtr += 1;
    } else {
      const prev = segments[segments.length - 1];
      if (prev?.type === "text") {
        prev.value += ` ${token}`;
      } else {
        segments.push({ type: "text", value: token });
      }
    }
  });

  const distractorWords = shuffle(
    pool
      .filter((p) => p.reference !== passage.reference)
      .flatMap((p) => tokenizeVerse(p.content))
      .map((w) => w.replace(/[.,;:!?""''()]+$/, ""))
      .filter((w) => w.length >= 4 && !blanks.some((b) => normalizeWord(b.word) === normalizeWord(w))),
    rng
  ).slice(0, Math.max(4, blanks.length * 2));

  const wordBank = shuffle([...blanks.map((b) => b.word), ...distractorWords], rng).slice(
    0,
    blanks.length + 4
  );

  return {
    id: `puzzle-${passage.reference}`,
    reference: passage.reference,
    topic: passage.topic,
    segments,
    blanks,
    wordBank,
    fullText: passage.content,
  };
}

export function buildVersePuzzleRound(
  count = 8,
  locale: Locale = "sv",
  rng: () => number = Math.random
): VersePuzzleRound[] {
  const pool = getPassagePool(locale);
  const selected = shuffle(pool, rng).slice(0, Math.min(count, pool.length));
  return selected.map((p) => buildVersePuzzle(p, pool, locale, rng));
}

export function checkPuzzleAnswers(
  puzzle: VersePuzzleRound,
  answers: Record<number, string>
): boolean {
  return puzzle.blanks.every(
    (b) => normalizeWord(answers[b.slotIndex] ?? "") === normalizeWord(b.word)
  );
}
