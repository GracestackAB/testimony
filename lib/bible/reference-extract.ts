import { BOOK_PATTERNS_SORTED } from "./books";

const patternAlternation = BOOK_PATTERNS_SORTED.map((b) =>
  b.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
).join("|");

const REF_IN_TEXT_RE = new RegExp(
  `(?:^|[\\s(,;«"'])((?:${patternAlternation})\\s+\\d+:\\d+(?:-\\d+)?)`,
  "gi"
);

/**
 * Hittar svenska bibelreferenser i fri text (t.ex. "vad säger Rom 8:1?").
 */
export function extractSwedishReferences(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(REF_IN_TEXT_RE)) {
    const ref = match[1].replace(/\s+/g, " ").trim();
    const key = ref.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(ref);
  }

  return found;
}
