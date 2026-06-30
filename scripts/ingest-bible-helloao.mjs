#!/usr/bin/env node
/**
 * Indexerar hela Bibeln (HelloAO / public domain) till pgvector.
 *
 * Översättningar: swe_fol (sv), BSB (en), HBOMAS (he), grc_sbl (el)
 *
 *   node scripts/ingest-bible-helloao.mjs
 *   node scripts/ingest-bible-helloao.mjs --translation BSB
 *   node scripts/ingest-bible-helloao.mjs --clear-legacy
 *
 * Kräver: DATABASE_URL + Azure OpenAI eller OPENROUTER_API_KEY
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const API_BASE = "https://bible.helloao.org";
const CHECKPOINT_PATH = path.join(ROOT, "data/bible-ingest-checkpoint.json");

const TRANSLATIONS = [
  { id: "swe_fol", language: "sv", label: "Svenska Folkbibeln" },
  { id: "BSB", language: "en", label: "Berean Standard Bible" },
  { id: "HBOMAS", language: "he", label: "Hebrew Masoretic OT" },
  { id: "grc_sbl", language: "el", label: "SBL Greek NT" },
];

const SWEDISH_BY_USFM = {
  GEN: "1 Mos", EXO: "2 Mos", LEV: "3 Mos", NUM: "4 Mos", DEU: "5 Mos",
  JOS: "Jos", JDG: "Dom", RUT: "Rut", "1SA": "1 Sam", "2SA": "2 Sam",
  "1KI": "1 Kung", "2KI": "2 Kung", "1CH": "1 Krön", "2CH": "2 Krön",
  EZR: "Esra", NEH: "Neh", EST: "Est", JOB: "Job", PSA: "Ps", PRO: "Ords",
  ECC: "Pred", SNG: "Höga visan", ISA: "Jes", JER: "Jer", LAM: "Klag",
  EZK: "Hes", DAN: "Dan", HOS: "Hos", JOL: "Joel", AMO: "Am", OBA: "Obad",
  JON: "Jon", MIC: "Mika", NAH: "Nah", HAB: "Hab", ZEP: "Sef", HAG: "Hagg",
  ZEC: "Sak", MAL: "Mal", MAT: "Matt", MRK: "Mark", LUK: "Luk", JHN: "Joh",
  ACT: "Apg", ROM: "Rom", "1CO": "1 Kor", "2CO": "2 Kor", GAL: "Gal",
  EPH: "Ef", PHP: "Fil", COL: "Kol", "1TH": "1 Tess", "2TH": "2 Tess",
  "1TI": "1 Tim", "2TI": "2 Tim", TIT: "Tit", PHM: "Filem", HEB: "Hebr",
  JAS: "Jak", "1PE": "1 Pet", "2PE": "2 Pet", "1JN": "1 Joh", "2JN": "2 Joh",
  "3JN": "3 Joh", JUD: "Jud", REV: "Upp",
};

const ENGLISH_BY_USFM = {
  GEN: "Genesis", EXO: "Exodus", LEV: "Leviticus", NUM: "Numbers", DEU: "Deuteronomy",
  JOS: "Joshua", JDG: "Judges", RUT: "Ruth", "1SA": "1 Samuel", "2SA": "2 Samuel",
  "1KI": "1 Kings", "2KI": "2 Kings", "1CH": "1 Chronicles", "2CH": "2 Chronicles",
  EZR: "Ezra", NEH: "Nehemiah", EST: "Esther", JOB: "Job", PSA: "Psalms", PRO: "Proverbs",
  ECC: "Ecclesiastes", SNG: "Song of Songs", ISA: "Isaiah", JER: "Jeremiah", LAM: "Lamentations",
  EZK: "Ezekiel", DAN: "Daniel", HOS: "Hosea", JOL: "Joel", AMO: "Amos", OBA: "Obadiah",
  JON: "Jonah", MIC: "Micah", NAH: "Nahum", HAB: "Habakkuk", ZEP: "Zephaniah", HAG: "Haggai",
  ZEC: "Zechariah", MAL: "Malachi", MAT: "Matthew", MRK: "Mark", LUK: "Luke", JHN: "John",
  ACT: "Acts", ROM: "Romans", "1CO": "1 Corinthians", "2CO": "2 Corinthians", GAL: "Galatians",
  EPH: "Ephesians", PHP: "Philippians", COL: "Colossians", "1TH": "1 Thessalonians",
  "2TH": "2 Thessalonians", "1TI": "1 Timothy", "2TI": "2 Timothy", TIT: "Titus",
  PHM: "Philemon", HEB: "Hebrews", JAS: "James", "1PE": "1 Peter", "2PE": "2 Peter",
  "1JN": "1 John", "2JN": "2 John", "3JN": "3 John", JUD: "Jude", REV: "Revelation",
};

const NT_BOOKS = new Set([
  "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL",
  "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN",
  "3JN", "JUD", "REV",
]);

const DATABASE_URL = process.env.DATABASE_URL;
const OR_KEY = process.env.OPENROUTER_API_KEY;
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, "");
const AZURE_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";
const AZURE_EMBED_DEPLOYMENT = process.env.AZURE_OPENAI_EMBED_DEPLOYMENT || "text-embedding-3-small";
const useAzure = process.env.AI_PROVIDER === "azure" || (!OR_KEY && AZURE_ENDPOINT && AZURE_KEY);

const args = process.argv.slice(2);
const onlyTranslation = args.includes("--translation")
  ? args[args.indexOf("--translation") + 1]
  : null;
const clearLegacy = args.includes("--clear-legacy");
const embedBatchSize = Number(process.env.BIBLE_EMBED_BATCH || 12);
const embedDelayMs = Number(process.env.BIBLE_EMBED_DELAY_MS || 1200);

if (!DATABASE_URL) {
  console.error("Saknar DATABASE_URL");
  process.exit(1);
}
if (!useAzure && !OR_KEY) {
  console.error("Saknar AI-provider (Azure OpenAI eller OPENROUTER_API_KEY)");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("azure.com") ? { rejectUnauthorized: false } : undefined,
});

function flattenContent(nodes) {
  const parts = [];
  for (const node of nodes ?? []) {
    if (typeof node === "string") parts.push(node);
    else if (node?.text) parts.push(node.text);
  }
  return parts.join("").replace(/\s+/g, " ").trim();
}

function parseVerses(content) {
  const verses = [];
  for (const node of content ?? []) {
    if (node?.type === "verse" && typeof node.number === "number") {
      const text = flattenContent(node.content);
      if (text) verses.push({ verse: node.number, text });
    }
  }
  return verses;
}

function formatReference(lang, bookId, chapter, verse, bookName) {
  if (lang === "sv") {
    const sw = SWEDISH_BY_USFM[bookId] ?? bookName ?? bookId;
    return `${sw} ${chapter}:${verse}`;
  }
  if (lang === "en") {
    const en = ENGLISH_BY_USFM[bookId] ?? bookName ?? bookId;
    return `${en} ${chapter}:${verse}`;
  }
  return `${bookId} ${chapter}:${verse}`;
}

async function fetchJson(urlPath) {
  const res = await fetch(`${API_BASE}${urlPath}`);
  if (!res.ok) throw new Error(`HelloAO ${res.status} ${urlPath}`);
  return res.json();
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function embedBatch(texts, attempt = 0) {
  try {
    if (useAzure) {
      const url = `${AZURE_ENDPOINT}/openai/deployments/${encodeURIComponent(AZURE_EMBED_DEPLOYMENT)}/embeddings?api-version=${AZURE_API_VERSION}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "api-key": AZURE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ input: texts }),
      });
      if (res.status === 429 && attempt < 8) {
        const body = await res.text();
        const waitSec = Number(body.match(/retry after (\d+)/i)?.[1] ?? 20);
        console.warn(`\n  Rate limit — väntar ${waitSec}s…`);
        await sleep((waitSec + 2) * 1000);
        return embedBatch(texts, attempt + 1);
      }
      if (!res.ok) throw new Error(`azure embed ${res.status}: ${await res.text()}`);
      const json = await res.json();
      return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    }

    const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${OR_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENROUTER_EMBED_MODEL || "openai/text-embedding-3-small",
        input: texts,
      }),
    });
    if (res.status === 429 && attempt < 8) {
      await sleep(15_000);
      return embedBatch(texts, attempt + 1);
    }
    if (!res.ok) throw new Error(`embed ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  } catch (err) {
    if (attempt < 5) {
      await sleep(10_000);
      return embedBatch(texts, attempt + 1);
    }
    throw err;
  }
}

async function loadCheckpoint() {
  try {
    return JSON.parse(await fs.readFile(CHECKPOINT_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function saveCheckpoint(data) {
  await fs.mkdir(path.dirname(CHECKPOINT_PATH), { recursive: true });
  await fs.writeFile(CHECKPOINT_PATH, JSON.stringify(data, null, 2));
}

async function upsertChunks(rows) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of rows) {
      await client.query(
        `INSERT INTO testimony.bible_chunks
           (reference, book, testament, topic, content, embedding, translation_id, language, usfm, chapter, verse)
         VALUES ($1, $2, $3, $4, $5, $6::vector, $7, $8, $9, $10, $11)
         ON CONFLICT (translation_id, usfm) DO UPDATE SET
           reference = EXCLUDED.reference,
           content = EXCLUDED.content,
           embedding = EXCLUDED.embedding,
           book = EXCLUDED.book,
           testament = EXCLUDED.testament`,
        [
          row.reference,
          row.book,
          row.testament,
          null,
          row.content,
          `[${row.embedding.join(",")}]`,
          row.translationId,
          row.language,
          row.usfm,
          row.chapter,
          row.verse,
        ]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function ingestTranslation(translation, checkpoint) {
  const { id: translationId, language, label } = translation;
  const ckKey = translationId;
  const startBook = checkpoint[ckKey]?.bookOrder ?? 1;
  const startChapter = checkpoint[ckKey]?.chapter ?? 1;

  console.log(`\n=== ${label} (${translationId}) ===`);

  const { books } = await fetchJson(`/api/${translationId}/books.json`);
  const sorted = [...books].sort((a, b) => a.order - b.order);

  let totalVerses = 0;
  const pending = [];

  async function flushPending() {
    if (pending.length === 0) return;
    const batch = pending.splice(0, pending.length);
    const texts = batch.map((r) => `[${r.language}] ${r.reference}: ${r.content}`);
    const embeddings = await embedBatch(texts);
    for (let i = 0; i < batch.length; i++) {
      batch[i].embedding = embeddings[i];
    }
    await upsertChunks(batch);
    totalVerses += batch.length;
    process.stdout.write(`\r  ${totalVerses} verser indexerade…`);
    if (embedDelayMs > 0) await sleep(embedDelayMs);
  }

  for (const book of sorted) {
    if (book.order < startBook) continue;

    const testament = NT_BOOKS.has(book.id) ? "nt" : "gt";
    const chapterFrom = book.order === startBook ? startChapter : 1;

    for (let chapter = chapterFrom; chapter <= book.numberOfChapters; chapter++) {
      const data = await fetchJson(`/api/${translationId}/${book.id}/${chapter}.json`);
      const verses = parseVerses(data.chapter?.content);

      for (const v of verses) {
        const usfm = `${book.id}.${chapter}.${v.verse}`;
        pending.push({
          translationId,
          language,
          usfm,
          reference: formatReference(language, book.id, chapter, v.verse, book.commonName),
          book: book.commonName,
          testament,
          chapter,
          verse: v.verse,
          content: v.text,
        });

        if (pending.length >= embedBatchSize) {
          await flushPending();
        }
      }

      checkpoint[ckKey] = { bookOrder: book.order, bookId: book.id, chapter: chapter + 1 };
      if (chapter % 10 === 0) await saveCheckpoint(checkpoint);
    }

    checkpoint[ckKey] = { bookOrder: book.order + 1, bookId: book.id, chapter: 1 };
    await saveCheckpoint(checkpoint);
  }

  await flushPending();
  console.log(`\n  ✓ ${label}: ${totalVerses} verser`);
  delete checkpoint[ckKey];
  await saveCheckpoint(checkpoint);
}

async function main() {
  if (clearLegacy) {
    const res = await pool.query(`DELETE FROM testimony.bible_chunks WHERE translation_id = 'legacy'`);
    console.log(`Raderade ${res.rowCount} legacy-chunks`);
  }

  const checkpoint = await loadCheckpoint();
  const targets = onlyTranslation
    ? TRANSLATIONS.filter((t) => t.id === onlyTranslation)
    : TRANSLATIONS;

  if (targets.length === 0) {
    console.error(`Okänd översättning: ${onlyTranslation}`);
    process.exit(1);
  }

  console.log(`Indexerar ${targets.map((t) => t.id).join(", ")} till testimony.bible_chunks`);

  for (const t of targets) {
    await ingestTranslation(t, checkpoint);
  }

  const { rows } = await pool.query(
    `SELECT translation_id, language, count(*)::int AS n
     FROM testimony.bible_chunks GROUP BY translation_id, language ORDER BY translation_id`
  );
  console.log("\nDatabas:");
  for (const r of rows) console.log(`  ${r.translation_id} (${r.language}): ${r.n}`);

  await pool.end();
  console.log("\nKlart.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
