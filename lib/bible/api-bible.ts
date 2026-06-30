/**
 * API.Bible (scripture.api.bible) — exakta verscitat för dagens bibeltext.
 * @see https://scripture.api.bible/docs
 */
import { parseSwedishReference } from "./reference";

const API_BASE = "https://api.scripture.api.bible/v1";

/** CSB — tillgänglig på gratis API.Bible-konton (ingen svensk SFB ännu). */
export const DEFAULT_BIBLE_ID = "a556c5305ee15c3f-01";

export function isApiBibleConfigured(): boolean {
  return Boolean(process.env.API_BIBLE_KEY?.trim());
}

function apiKey(): string {
  const key = process.env.API_BIBLE_KEY?.trim();
  if (!key) throw new Error("API_BIBLE_KEY saknas");
  return key;
}

function bibleId(): string {
  return process.env.API_BIBLE_ID?.trim() || DEFAULT_BIBLE_ID;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

type PassageResponse = {
  data?: {
    content?: string;
    reference?: string;
    copyright?: string;
  };
};

type SearchVerse = {
  id: string;
  reference: string;
  text: string;
};

type SearchResponse = {
  data?: {
    verses?: SearchVerse[];
  };
};

export type BibleSearchResult = {
  id: string;
  englishReference: string;
  swedishReference: string;
  text: string;
};

/**
 * Söker i hela bibeln via API.Bible (engelska CSB).
 */
export async function searchBibleVerses(
  query: string,
  limit = 8
): Promise<BibleSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    query: q,
    limit: String(Math.min(limit, 20)),
  });

  const url = `${API_BASE}/bibles/${bibleId()}/search?${params}`;
  const res = await fetch(url, {
    headers: { "api-key": apiKey() },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API.Bible search ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as SearchResponse;
  const verses = json.data?.verses ?? [];

  const { englishReferenceToSwedish } = await import("./books");

  return verses.map((v) => ({
    id: v.id,
    englishReference: v.reference,
    swedishReference: englishReferenceToSwedish(v.reference),
    text: stripHtml(v.text),
  }));
}

/**
 * Hämtar vers(er) som ren text från API.Bible.
 */
export async function fetchPassageText(swedishReference: string): Promise<{
  text: string;
  englishReference: string;
  copyright: string | null;
}> {
  const parsed = parseSwedishReference(swedishReference);
  const params = new URLSearchParams({
    "content-type": "text",
    "include-notes": "false",
    "include-titles": "false",
    "include-chapter-numbers": "false",
    "include-verse-numbers": "false",
  });

  const url = `${API_BASE}/bibles/${bibleId()}/passages/${encodeURIComponent(parsed.passageId)}?${params}`;
  const res = await fetch(url, {
    headers: { "api-key": apiKey() },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API.Bible ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as PassageResponse;
  const content = json.data?.content?.trim();
  if (!content) {
    throw new Error(`API.Bible returnerade tom text för ${swedishReference}`);
  }

  return {
    text: stripHtml(content),
    englishReference: json.data?.reference ?? parsed.englishQuery,
    copyright: json.data?.copyright ?? null,
  };
}
