/**
 * HelloAO Free Use Bible API — public domain, ingen API-nyckel.
 * @see https://bible.helloao.org/docs/reference/
 */
import { getBookByUsfmId } from "@/lib/bible/books";
import { parseSwedishReference } from "@/lib/bible/reference";
import { parseHelloAoVerses } from "@/lib/bible/verse-extract";
import { HELLOAO_API_BASE, RAG_TRANSLATIONS, type RagTranslation } from "@/lib/bible/translations";

export type HelloAoBook = {
  id: string;
  name: string;
  commonName: string;
  order: number;
  numberOfChapters: number;
};

export type HelloAoVersePassage = {
  translationId: string;
  language: RagTranslation["language"];
  usfm: string;
  reference: string;
  content: string;
};

type ChapterResponse = {
  book: HelloAoBook;
  chapter: { number: number; content: unknown[] };
};

async function fetchJson<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${HELLOAO_API_BASE}${path}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) {
    throw new Error(`HelloAO ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export function isHelloAoAvailable(): boolean {
  return true;
}

export async function listTranslationBooks(translationId: string): Promise<HelloAoBook[]> {
  const data = await fetchJson<{ books: HelloAoBook[] }>(`/api/${translationId}/books.json`);
  return data.books ?? [];
}

export async function fetchChapterVerses(
  translationId: string,
  bookId: string,
  chapter: number
): Promise<{ book: HelloAoBook; verses: { verse: number; text: string }[] }> {
  const data = await fetchJson<ChapterResponse>(`/api/${translationId}/${bookId}/${chapter}.json`);
  const verses = parseHelloAoVerses((data.chapter?.content ?? []) as Parameters<typeof parseHelloAoVerses>[0]);
  return { book: data.book, verses };
}

function formatReference(
  translation: RagTranslation,
  bookId: string,
  chapter: number,
  verse: number,
  bookName?: string
): string {
  const book = getBookByUsfmId(bookId);
  if (translation.language === "sv" && book) {
    return `${book.pattern} ${chapter}:${verse}`;
  }
  const name = bookName ?? book?.english ?? bookId;
  return `${name} ${chapter}:${verse}`;
}

/**
 * Hämtar en eller flera verser live från HelloAO.
 */
export async function fetchHelloAoPassage(
  translationId: string,
  bookId: string,
  chapter: number,
  verseStart: number,
  verseEnd?: number
): Promise<HelloAoVersePassage | null> {
  const translation = RAG_TRANSLATIONS.find((t) => t.id === translationId);
  if (!translation) return null;

  const end = verseEnd ?? verseStart;
  const { book, verses } = await fetchChapterVerses(translationId, bookId, chapter);
  const selected = verses.filter((v) => v.verse >= verseStart && v.verse <= end);
  if (selected.length === 0) return null;

  const usfm =
    verseStart === end
      ? `${bookId}.${chapter}.${verseStart}`
      : `${bookId}.${chapter}.${verseStart}-${bookId}.${chapter}.${end}`;

  const content = selected.map((v) => v.text).join(" ");
  const reference = formatReference(translation, bookId, chapter, verseStart, book.commonName);

  return {
    translationId,
    language: translation.language,
    usfm,
    reference:
      verseStart === end
        ? reference
        : `${formatReference(translation, bookId, chapter, verseStart, book.commonName).replace(/:\d+$/, "")}:${verseStart}-${end}`,
    content,
  };
}

/**
 * Hämtar samma referens i alla RAG-översättningar som har boken.
 */
export async function fetchPassageAllTranslations(swedishRef: string): Promise<HelloAoVersePassage[]> {
  let parsed;
  try {
    parsed = parseSwedishReference(swedishRef);
  } catch {
    return [];
  }

  const results = await Promise.all(
    RAG_TRANSLATIONS.map((t) =>
      fetchHelloAoPassage(t.id, parsed.bookId, parsed.chapter, parsed.verseStart, parsed.verseEnd).catch(
        () => null
      )
    )
  );

  return results.filter((r): r is HelloAoVersePassage => r !== null);
}
