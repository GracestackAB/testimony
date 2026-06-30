/** Svenska boknamn → API.Bible USFM bookId (sorteras längst först vid matchning). */
export type BibleBook = {
  pattern: string;
  id: string;
  english: string;
  testament: "gt" | "nt";
};

export const SWEDISH_BOOKS: BibleBook[] = [
  { pattern: "Höga visan", id: "SNG", english: "Song of Songs", testament: "gt" },
  { pattern: "Höga Visan", id: "SNG", english: "Song of Songs", testament: "gt" },
  { pattern: "1 Krön", id: "1CH", english: "1 Chronicles", testament: "gt" },
  { pattern: "2 Krön", id: "2CH", english: "2 Chronicles", testament: "gt" },
  { pattern: "1 Kor", id: "1CO", english: "1 Corinthians", testament: "nt" },
  { pattern: "2 Kor", id: "2CO", english: "2 Corinthians", testament: "nt" },
  { pattern: "1 Tess", id: "1TH", english: "1 Thessalonians", testament: "nt" },
  { pattern: "2 Tess", id: "2TH", english: "2 Thessalonians", testament: "nt" },
  { pattern: "1 Sam", id: "1SA", english: "1 Samuel", testament: "gt" },
  { pattern: "2 Sam", id: "2SA", english: "2 Samuel", testament: "gt" },
  { pattern: "1 Kung", id: "1KI", english: "1 Kings", testament: "gt" },
  { pattern: "2 Kung", id: "2KI", english: "2 Kings", testament: "gt" },
  { pattern: "1 Mos", id: "GEN", english: "Genesis", testament: "gt" },
  { pattern: "2 Mos", id: "EXO", english: "Exodus", testament: "gt" },
  { pattern: "3 Mos", id: "LEV", english: "Leviticus", testament: "gt" },
  { pattern: "4 Mos", id: "NUM", english: "Numbers", testament: "gt" },
  { pattern: "5 Mos", id: "DEU", english: "Deuteronomy", testament: "gt" },
  { pattern: "1 Pet", id: "1PE", english: "1 Peter", testament: "nt" },
  { pattern: "2 Pet", id: "2PE", english: "2 Peter", testament: "nt" },
  { pattern: "1 Tim", id: "1TI", english: "1 Timothy", testament: "nt" },
  { pattern: "2 Tim", id: "2TI", english: "2 Timothy", testament: "nt" },
  { pattern: "1 Joh", id: "1JN", english: "1 John", testament: "nt" },
  { pattern: "2 Joh", id: "2JN", english: "2 John", testament: "nt" },
  { pattern: "3 Joh", id: "3JN", english: "3 John", testament: "nt" },
  { pattern: "Johannes", id: "JHN", english: "John", testament: "nt" },
  { pattern: "Pred", id: "ECC", english: "Ecclesiastes", testament: "gt" },
  { pattern: "Ords", id: "PRO", english: "Proverbs", testament: "gt" },
  { pattern: "Klag", id: "LAM", english: "Lamentations", testament: "gt" },
  { pattern: "Hebr", id: "HEB", english: "Hebrews", testament: "nt" },
  { pattern: "Matt", id: "MAT", english: "Matthew", testament: "nt" },
  { pattern: "Mark", id: "MRK", english: "Mark", testament: "nt" },
  { pattern: "Fil", id: "PHP", english: "Philippians", testament: "nt" },
  { pattern: "Filem", id: "PHM", english: "Philemon", testament: "nt" },
  { pattern: "Hes", id: "EZK", english: "Ezekiel", testament: "gt" },
  { pattern: "Mika", id: "MIC", english: "Micah", testament: "gt" },
  { pattern: "Obad", id: "OBA", english: "Obadiah", testament: "gt" },
  { pattern: "Hagg", id: "HAG", english: "Haggai", testament: "gt" },
  { pattern: "Sak", id: "ZEC", english: "Zechariah", testament: "gt" },
  { pattern: "Apg", id: "ACT", english: "Acts", testament: "nt" },
  { pattern: "Luk", id: "LUK", english: "Luke", testament: "nt" },
  { pattern: "Joh", id: "JHN", english: "John", testament: "nt" },
  { pattern: "Rom", id: "ROM", english: "Romans", testament: "nt" },
  { pattern: "Gal", id: "GAL", english: "Galatians", testament: "nt" },
  { pattern: "Ef", id: "EPH", english: "Ephesians", testament: "nt" },
  { pattern: "Kol", id: "COL", english: "Colossians", testament: "nt" },
  { pattern: "Jak", id: "JAS", english: "James", testament: "nt" },
  { pattern: "Jud", id: "JUD", english: "Jude", testament: "nt" },
  { pattern: "Jes", id: "ISA", english: "Isaiah", testament: "gt" },
  { pattern: "Jer", id: "JER", english: "Jeremiah", testament: "gt" },
  { pattern: "Hos", id: "HOS", english: "Hosea", testament: "gt" },
  { pattern: "Jos", id: "JOS", english: "Joshua", testament: "gt" },
  { pattern: "Jon", id: "JON", english: "Jonah", testament: "gt" },
  { pattern: "Job", id: "JOB", english: "Job", testament: "gt" },
  { pattern: "Mal", id: "MAL", english: "Malachi", testament: "gt" },
  { pattern: "Mik", id: "MIC", english: "Micah", testament: "gt" },
  { pattern: "Neh", id: "NEH", english: "Nehemiah", testament: "gt" },
  { pattern: "Esra", id: "EZR", english: "Ezra", testament: "gt" },
  { pattern: "Est", id: "EST", english: "Esther", testament: "gt" },
  { pattern: "Rut", id: "RUT", english: "Ruth", testament: "gt" },
  { pattern: "Dom", id: "JDG", english: "Judges", testament: "gt" },
  { pattern: "Ps", id: "PSA", english: "Psalms", testament: "gt" },
  { pattern: "Am", id: "AMO", english: "Amos", testament: "gt" },
  { pattern: "Dan", id: "DAN", english: "Daniel", testament: "gt" },
  { pattern: "Tit", id: "TIT", english: "Titus", testament: "nt" },
  { pattern: "Upp", id: "REV", english: "Revelation", testament: "nt" },
  { pattern: "Nah", id: "NAM", english: "Nahum", testament: "gt" },
  { pattern: "Hab", id: "HAB", english: "Habakkuk", testament: "gt" },
  { pattern: "Sef", id: "ZEP", english: "Zephaniah", testament: "gt" },
  { pattern: "Joel", id: "JOL", english: "Joel", testament: "gt" },
];

const byUsfm = new Map<string, BibleBook>();
const byEnglish = new Map<string, BibleBook>();

for (const book of SWEDISH_BOOKS) {
  if (!byUsfm.has(book.id)) byUsfm.set(book.id, book);
  if (!byEnglish.has(book.english)) byEnglish.set(book.english, book);
}

/** Längsta mönster först — viktigt vid regex-matchning. */
export const BOOK_PATTERNS_SORTED = [...SWEDISH_BOOKS].sort(
  (a, b) => b.pattern.length - a.pattern.length
);

export function getBookByUsfmId(id: string): BibleBook | undefined {
  return byUsfm.get(id);
}

/**
 * Konverterar API.Bible-referens (engelska) till svensk kortform, t.ex. "Romans 8:1" → "Rom 8:1".
 */
export function englishReferenceToSwedish(reference: string): string {
  const normalized = reference.replace(/\u2013/g, "-").trim();
  const match = normalized.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return reference;

  const englishBook = match[1].trim();
  const book = byEnglish.get(englishBook);
  if (!book) return reference;

  const versePart = match[4] ? `${match[3]}-${match[4]}` : match[3];
  return `${book.pattern} ${match[2]}:${versePart}`;
}
