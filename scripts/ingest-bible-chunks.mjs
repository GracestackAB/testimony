#!/usr/bin/env node
/**
 * Indexerar bibelstycken (pgvector) för RAG.
 * Kräver: Azure OpenAI eller OPENROUTER_API_KEY + (DATABASE_URL eller Supabase-nycklar)
 *
 *   node scripts/ingest-bible-chunks.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OR_KEY = process.env.OPENROUTER_API_KEY;
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, "");
const AZURE_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";
const AZURE_EMBED_DEPLOYMENT = process.env.AZURE_OPENAI_EMBED_DEPLOYMENT || "text-embedding-3-small";

const useAzure =
  process.env.AI_PROVIDER === "azure" || (!OR_KEY && AZURE_ENDPOINT && AZURE_KEY);

if (!useAzure && !OR_KEY) {
  console.error("Saknar AI-provider (Azure OpenAI eller OPENROUTER_API_KEY)");
  process.exit(1);
}
if (useAzure && (!AZURE_ENDPOINT || !AZURE_KEY)) {
  console.error("Saknar AZURE_OPENAI_ENDPOINT eller AZURE_OPENAI_API_KEY");
  process.exit(1);
}
if (!DATABASE_URL && (!SUPABASE_URL || !SRK)) {
  console.error("Saknar DATABASE_URL eller Supabase-nycklar");
  process.exit(1);
}

const supabase = !DATABASE_URL ? createClient(SUPABASE_URL, SRK, { db: { schema: "testimony" } }) : null;
let pool;
if (DATABASE_URL) {
  pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("azure.com") ? { rejectUnauthorized: false } : undefined,
  });
}

async function embed(text) {
  if (useAzure) {
    const url = `${AZURE_ENDPOINT}/openai/deployments/${encodeURIComponent(AZURE_EMBED_DEPLOYMENT)}/embeddings?api-version=${AZURE_API_VERSION}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": AZURE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: text }),
    });
    if (!res.ok) throw new Error(`azure embed ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return json.data[0].embedding;
  }

  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OR_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_EMBED_MODEL || "openai/text-embedding-3-small",
      input: text,
    }),
  });
  if (!res.ok) throw new Error(`embed ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data[0].embedding;
}

async function upsertChunk(p, embedding) {
  if (pool) {
    await pool.query(
      `DELETE FROM testimony.bible_chunks WHERE reference = $1`,
      [p.reference]
    );
    await pool.query(
      `INSERT INTO testimony.bible_chunks (reference, book, testament, topic, content, embedding)
       VALUES ($1, $2, $3, $4, $5, $6::vector)`,
      [p.reference, p.book, p.testament, p.topic, p.content, `[${embedding.join(",")}]`]
    );
    return;
  }

  await supabase.schema("public").from("bible_chunks").delete().eq("reference", p.reference);
  const { error } = await supabase.schema("public").from("bible_chunks").insert({
    reference: p.reference,
    book: p.book,
    testament: p.testament,
    topic: p.topic,
    content: p.content,
    embedding,
  });
  if (error) throw error;
}

async function main() {
  const paths = [
    path.join(ROOT, "data/bible-seed/passages.json"),
    path.join(ROOT, "data/bible-seed/passages-extra.json"),
  ];
  const passages = [];
  const seen = new Set();
  for (const file of paths) {
    try {
      const raw = await fs.readFile(file, "utf8");
      for (const p of JSON.parse(raw)) {
        if (seen.has(p.reference)) continue;
        seen.add(p.reference);
        passages.push(p);
      }
    } catch {
      // passages-extra.json är valfri
    }
  }

  console.log(`Indexerar ${passages.length} bibelstycken (${DATABASE_URL ? "Azure PG" : "Supabase"})…`);

  for (const p of passages) {
    const text = `${p.reference}: ${p.content}`;
    const embedding = await embed(text);
    await upsertChunk(p, embedding);
    console.log(`  ✓ ${p.reference}`);
  }

  if (pool) await pool.end();
  console.log("Klart.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
