import passagesSv from "@/data/bible-seed/passages.json";
import passagesEn from "@/data/bible-seed/passages-en.json";
import type { Locale } from "@/lib/i18n/types";

export type BiblePassage = {
  reference: string;
  book: string;
  testament: "ot" | "nt";
  topic: string;
  content: string;
};

export type QuizMode = "reference" | "verse";

export type QuizQuestion = {
  id: string;
  mode: QuizMode;
  passage: BiblePassage;
  prompt: string;
  options: string[];
  correctIndex: number;
};

const PASSAGES_BY_LOCALE: Record<Locale, BiblePassage[]> = {
  sv: passagesSv as BiblePassage[],
  en: passagesEn as BiblePassage[],
};

/** Mulberry32 PRNG — deterministic quiz rounds from a string seed. */
export function seedRngFromString(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle (injectable rng for tests). */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Truncate long verses for display without breaking mid-word when possible. */
export function truncateVerse(text: string, maxLen = 140): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const slice = trimmed.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxLen * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut}…`;
}

function pickDistractors(
  pool: BiblePassage[],
  correct: BiblePassage,
  count: number,
  rng: () => number
): BiblePassage[] {
  const others = pool.filter((p) => p.reference !== correct.reference);
  return shuffle(others, rng).slice(0, count);
}

function optionLabel(passage: BiblePassage, mode: QuizMode): string {
  return mode === "reference" ? passage.reference : truncateVerse(passage.content, 100);
}

/**
 * Build one multiple-choice question from a passage.
 */
export function buildQuestion(
  passage: BiblePassage,
  pool: BiblePassage[],
  mode: QuizMode,
  rng: () => number = Math.random
): QuizQuestion {
  const distractors = pickDistractors(pool, passage, 3, rng);
  const choices = shuffle([passage, ...distractors], rng);
  const correctIndex = choices.findIndex((p) => p.reference === passage.reference);
  const prompt =
    mode === "reference" ? truncateVerse(passage.content, 200) : passage.reference;

  return {
    id: `${mode}-${passage.reference}`,
    mode,
    passage,
    prompt,
    options: choices.map((p) => optionLabel(p, mode)),
    correctIndex,
  };
}

/**
 * Build a quiz round with alternating question modes.
 */
/**
 * Build a quiz round with a stable seed (e.g. challenge id) so both players get the same questions.
 */
export function buildQuizWithSeed(
  count: number,
  locale: Locale,
  seed: string
): QuizQuestion[] {
  return buildQuiz(count, locale, seedRngFromString(seed));
}

export function buildQuiz(
  count = 10,
  locale: Locale = "sv",
  rng: () => number = Math.random
): QuizQuestion[] {
  const pool = getPassagePool(locale);
  if (pool.length < 4) {
    throw new Error("At least 4 passages required for bible quiz");
  }

  const limit = Math.min(count, pool.length);
  const selected = shuffle(pool, rng).slice(0, limit);

  return selected.map((passage, i) =>
    buildQuestion(passage, pool, i % 2 === 0 ? "reference" : "verse", rng)
  );
}

export function getPassagePool(locale: Locale = "sv"): BiblePassage[] {
  return PASSAGES_BY_LOCALE[locale] ?? PASSAGES_BY_LOCALE.sv;
}

export function isCorrectAnswer(question: QuizQuestion, optionIndex: number): boolean {
  return optionIndex === question.correctIndex;
}
