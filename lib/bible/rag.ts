import { embedText, chatCompletion } from "@/lib/ai/client";
import { createServiceClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { suggestBibleFollowUps } from "@/lib/bible/follow-ups";
import { fetchPassageAllTranslations } from "@/lib/bible/helloao";
import { extractBibleQueryHints } from "@/lib/bible/query-hints";
import { extractSwedishReferences } from "@/lib/bible/reference-extract";
import { RAG_TRANSLATIONS } from "@/lib/bible/translations";

export type BibleSource = {
  reference: string;
  content: string;
  similarity: number;
  language?: string;
  translationId?: string;
};

export type BibleAnswer = {
  answer: string;
  sources: BibleSource[];
  disclaimer: string;
  lowConfidence: boolean;
  followUps: string[];
  rateLimit?: { remaining: number; limit: number };
};

/** Tröskel: under detta anses källorna svaga. */
export const LOW_CONFIDENCE_SIMILARITY = 0.32;

const SYSTEM_PROMPT_SV = `Du är en kristen bibelguide för testimony.se (respektfull, evangelikal protestantisk tradition).

SPRÅK: Svara på svenska. Om källorna innehåller hebreiska eller grekiska ord, förklara dem tydligt på svenska.

STRIKTA REGLER:
1. Svara ENDAST baserat på de bifogade källtexten. Om källorna inte räcker: säg det ärligt.
2. Hitta ALDRIG på verscitat eller referenser som inte finns i källorna.
3. Ange alltid referens när du citerar (t.ex. "Rom 8:1").
4. Vid originalspråk: nämn hebreiska (GT) eller grekiska (NT) när det tillför förståelse.
5. Var pastoral men saklig. 2–5 stycken.`;

const SYSTEM_PROMPT_EN = `You are a Christian Bible guide for testimony.se (respectful, evangelical Protestant tradition).

LANGUAGE: Answer in English. When sources include Hebrew or Greek, explain key terms clearly.

STRICT RULES:
1. Answer ONLY from the provided source texts. If sources are insufficient, say so honestly.
2. NEVER invent verse quotes or references not in the sources.
3. Always cite references when quoting (e.g. "Rom 8:1").
4. Mention Hebrew (OT) or Greek (NT) when it adds understanding.
5. Be pastoral yet clear. 2–5 paragraphs.`;

function sourceKey(reference: string, translationId?: string): string {
  return `${translationId ?? ""}|${reference.replace(/\s+/g, " ").trim().toLowerCase()}`;
}

type ChunkRow = BibleSource & { translationId?: string; language?: string };

/**
 * Hämtar relevanta bibelchunks via vektorsökning (alla indexerade översättningar).
 */
export async function retrieveBibleChunks(
  question: string,
  limit = 10,
  languages?: string[]
): Promise<ChunkRow[]> {
  const [embedding] = await embedText(question);

  if (process.env.DATABASE_URL) {
    const { getPool } = await import("@/lib/db");
    const pool = getPool();
    const res = await pool.query(
      `SELECT id, reference, content, translation_id, language,
        1 - (embedding <=> $1::vector) AS similarity
       FROM testimony.bible_chunks
       WHERE embedding IS NOT NULL
         AND translation_id <> 'legacy'
         AND 1 - (embedding <=> $1::vector) >= 0.20
         AND ($3::text[] IS NULL OR language = ANY($3::text[]))
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [`[${embedding.join(",")}]`, limit, languages?.length ? languages : null]
    );
    return res.rows.map((row) => ({
      reference: row.reference as string,
      content: row.content as string,
      similarity: Number(row.similarity),
      translationId: row.translation_id as string,
      language: row.language as string,
    }));
  }

  const svc = await createServiceClient();
  const { data, error } = await svc.rpc("match_bible_chunks", {
    query_embedding: embedding,
    match_count: limit,
    min_similarity: 0.2,
    filter_languages: languages?.length ? languages : null,
  });

  if (error) throw new Error(error.message);

  return (data || []).map((row: ChunkRow & { translation_id?: string }) => ({
    reference: row.reference,
    content: row.content,
    similarity: row.similarity,
    translationId: row.translation_id ?? row.translationId,
    language: row.language,
  }));
}

/**
 * Hämtar källor: vektorsökning + live HelloAO för explicita referenser.
 */
async function retrieveAllSources(
  question: string,
  locale: "sv" | "en"
): Promise<{ sources: BibleSource[]; answerLanguage: "sv" | "en" }> {
  const byKey = new Map<string, BibleSource>();

  const addSource = (source: BibleSource) => {
    const key = sourceKey(source.reference, source.translationId);
    const existing = byKey.get(key);
    if (!existing || source.similarity > existing.similarity) {
      byKey.set(key, source);
    }
  };

  const hints = await extractBibleQueryHints(question, locale);
  const explicitRefs = [...new Set([...extractSwedishReferences(question), ...hints.swedishReferences])];

  const preferLanguages: string[] = [];
  if (hints.answerLanguage === "sv") preferLanguages.push("sv", "en", "he", "el");
  else preferLanguages.push("en", "sv", "he", "el");

  const [vectorSources, livePassages] = await Promise.all([
    retrieveBibleChunks(
      `${hints.englishSearch} ${hints.hebrewTerms.join(" ")} ${hints.greekTerms.join(" ")}`.trim(),
      12,
      undefined
    ).catch(() => [] as ChunkRow[]),
    Promise.all(explicitRefs.map((ref) => fetchPassageAllTranslations(ref).catch(() => []))).then((r) =>
      r.flat()
    ),
  ]);

  for (const s of vectorSources) {
    addSource({
      reference: s.reference,
      content: s.content,
      similarity: s.similarity,
      language: s.language,
      translationId: s.translationId,
    });
  }

  for (const p of livePassages) {
    const label = RAG_TRANSLATIONS.find((t) => t.id === p.translationId)?.label ?? p.translationId;
    addSource({
      reference: `${p.reference} (${label})`,
      content: p.content,
      similarity: 0.98,
      language: p.language,
      translationId: p.translationId,
    });
  }

  const sources = [...byKey.values()]
    .sort((a, b) => {
      const langScore = (lang?: string) => {
        const idx = preferLanguages.indexOf(lang ?? "");
        return idx === -1 ? 99 : idx;
      };
      const ls = langScore(a.language) - langScore(b.language);
      if (ls !== 0) return ls;
      return b.similarity - a.similarity;
    })
    .slice(0, 12);

  return { sources, answerLanguage: hints.answerLanguage };
}

/**
 * Genererar RAG-svar med källhänvisningar (sv/en + hebreiska/grekiska källor).
 */
export async function answerBibleQuestion(
  question: string,
  userId?: string | null,
  locale: "sv" | "en" = "sv"
): Promise<BibleAnswer> {
  const { sources, answerLanguage } = await retrieveAllSources(question, locale);

  if (sources.length === 0) {
    const emptyMsg =
      answerLanguage === "en"
        ? "I couldn't find relevant Bible passages for your question. Try naming a specific book and verse (e.g. Rom 8:1), or rephrase your question."
        : "Jag hittade tyvärr ingen relevant bibeltext för din fråga. Prova att nämna en specifik bok och vers (t.ex. Rom 8:1), eller formulera frågan med andra ord.";
    return {
      answer: emptyMsg,
      sources: [],
      disclaimer:
        answerLanguage === "en"
          ? "Answers based on indexed Bible texts (Swedish, English, Hebrew OT, Greek NT) via HelloAO public-domain sources."
          : "Svar baserat på indexerade bibeltexter (svenska, engelska, hebreiska GT, grekiska NT) via HelloAO public domain.",
      lowConfidence: true,
      followUps: [],
    };
  }

  const maxSimilarity = Math.max(...sources.map((s) => s.similarity));
  const lowConfidence = maxSimilarity < LOW_CONFIDENCE_SIMILARITY;

  const context = sources
    .map((s, i) => {
      const langTag = s.language ? `[${s.language}] ` : "";
      return `[${i + 1}] ${langTag}${s.reference}: ${s.content}`;
    })
    .join("\n\n");

  const systemPrompt = answerLanguage === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_SV;

  const answer = await chatCompletion(
    [
      {
        role: "system",
        content:
          systemPrompt +
          (lowConfidence
            ? answerLanguage === "en"
              ? "\n\nNOTE: Sources are weakly matched — be extra careful and state uncertainty clearly."
              : "\n\nOBS: Källorna är svagt matchade — var extra försiktig och säg tydligt om du är osäker."
            : ""),
      },
      {
        role: "user",
        content: `Källor:\n${context}\n\nFråga: ${question}`,
      },
    ],
    "bible"
  );

  if (userId) {
    const svc = await createServiceClient();
    const hash = createHash("sha256").update(question.trim().toLowerCase()).digest("hex");
    await svc.from("bible_ai_queries").insert({
      user_id: userId,
      question_hash: hash,
      sources: sources.map((s) => ({
        reference: s.reference,
        similarity: s.similarity,
        language: s.language,
      })),
    });
  }

  const disclaimerSv =
    "AI-svar grundat på public domain-bibeltexter (Folkbibeln, Berean Standard Bible, hebreisk GT, SBL grekisk NT). Ersätter inte personlig andlig vägledning eller församlingsundervisning.";
  const disclaimerEn =
    "AI answers based on public-domain Bible texts (Swedish Folkbibeln, Berean Standard Bible, Hebrew OT, SBL Greek NT). Not a substitute for personal spiritual guidance or church teaching.";

  return {
    answer,
    sources,
    disclaimer: answerLanguage === "en" ? disclaimerEn : disclaimerSv,
    lowConfidence,
    followUps: suggestBibleFollowUps(question, sources, answerLanguage),
  };
}
