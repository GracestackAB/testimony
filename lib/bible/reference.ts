import { SWEDISH_BOOKS } from "./books";

export type ParsedReference = {
  bookId: string;
  englishBook: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  passageId: string;
  englishQuery: string;
};

const REF_RE = /^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/;

/**
 * Parsar svensk bibelreferens (t.ex. "Rom 8:38-39") till API.Bible passageId.
 */
export function parseSwedishReference(reference: string): ParsedReference {
  const normalized = reference.replace(/\u2013/g, "-").trim();
  const match = normalized.match(REF_RE);
  if (!match) {
    throw new Error(`Ogiltig bibelreferens: ${reference}`);
  }

  const bookPart = match[1].trim();
  const chapter = Number(match[2]);
  const verseStart = Number(match[3]);
  const verseEnd = match[4] ? Number(match[4]) : verseStart;

  if (!Number.isFinite(chapter) || !Number.isFinite(verseStart) || !Number.isFinite(verseEnd)) {
    throw new Error(`Ogiltiga versnummer i referens: ${reference}`);
  }
  if (verseEnd < verseStart) {
    throw new Error(`Versintervall ogiltigt: ${reference}`);
  }

  const book = SWEDISH_BOOKS.find((b) => bookPart === b.pattern || bookPart.startsWith(`${b.pattern} `));
  if (!book) {
    throw new Error(`Okänt bibelboknamn: ${bookPart}`);
  }

  const passageId =
    verseStart === verseEnd
      ? `${book.id}.${chapter}.${verseStart}`
      : `${book.id}.${chapter}.${verseStart}-${book.id}.${chapter}.${verseEnd}`;

  const versePart =
    verseStart === verseEnd ? `${verseStart}` : `${verseStart}-${verseEnd}`;
  const englishQuery = `${book.english} ${chapter}:${versePart}`;

  return {
    bookId: book.id,
    englishBook: book.english,
    chapter,
    verseStart,
    verseEnd,
    passageId,
    englishQuery,
  };
}
