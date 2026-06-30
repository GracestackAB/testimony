import {
  getPassagePool,
  shuffle,
  truncateVerse,
  type BiblePassage,
} from "@/lib/games/bible-quiz";
import type { Locale } from "@/lib/i18n/types";

export type TrueFalseQuestion = {
  id: string;
  statement: string;
  isTrue: boolean;
  explanation: string;
  reference: string;
  topic: string;
  snippet: string;
};

function trueStatement(passage: BiblePassage, locale: Locale): string {
  if (locale === "en") {
    return `${passage.reference} is about ${passage.topic.toLowerCase()}.`;
  }
  return `${passage.reference} handlar om ${passage.topic.toLowerCase()}.`;
}

function falseStatement(passage: BiblePassage, wrong: BiblePassage, locale: Locale): string {
  if (locale === "en") {
    return `${passage.reference} is about ${wrong.topic.toLowerCase()}.`;
  }
  return `${passage.reference} handlar om ${wrong.topic.toLowerCase()}.`;
}

function explanation(
  passage: BiblePassage,
  isTrue: boolean,
  locale: Locale,
  wrong?: BiblePassage
): string {
  const snippet = truncateVerse(passage.content, 120);
  if (locale === "en") {
    if (isTrue) {
      return `${passage.reference} — "${snippet}"`;
    }
    return `Actually ${passage.reference} is about ${passage.topic.toLowerCase()}, not ${wrong?.topic.toLowerCase()}. "${snippet}"`;
  }
  if (isTrue) {
    return `${passage.reference} — ”${snippet}”`;
  }
  return `Nej — ${passage.reference} handlar om ${passage.topic.toLowerCase()}, inte ${wrong?.topic.toLowerCase()}. ”${snippet}”`;
}

/**
 * Build one true/false question (50/50 true vs false).
 */
export function buildTrueFalseQuestion(
  passage: BiblePassage,
  pool: BiblePassage[],
  locale: Locale,
  rng: () => number = Math.random
): TrueFalseQuestion {
  const isTrue = rng() > 0.5;
  const others = pool.filter((p) => p.reference !== passage.reference);
  const wrong = others[Math.floor(rng() * others.length)] ?? passage;

  return {
    id: `tf-${passage.reference}-${isTrue ? "t" : "f"}`,
    statement: isTrue ? trueStatement(passage, locale) : falseStatement(passage, wrong, locale),
    isTrue,
    explanation: explanation(passage, isTrue, locale, wrong),
    reference: passage.reference,
    topic: passage.topic,
    snippet: truncateVerse(passage.content, 100),
  };
}

export function buildTrueFalseRound(
  count = 10,
  locale: Locale = "sv",
  rng: () => number = Math.random
): TrueFalseQuestion[] {
  const pool = getPassagePool(locale);
  const selected = shuffle(pool, rng).slice(0, Math.min(count, pool.length));
  return selected.map((p) => buildTrueFalseQuestion(p, pool, locale, rng));
}
