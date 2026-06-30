import { embedText, chatCompletion, type ChatKind } from "@/lib/ai/client";
import { createServiceClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { suggestBibleFollowUps } from "@/lib/bible/follow-ups";
import { fetchPassageAllTranslations } from "@/lib/bible/helloao";
import { extractBibleQueryHints } from "@/lib/bible/query-hints";
import { extractSwedishReferences } from "@/lib/bible/reference-extract";
import {
  lowConfidenceNote,
  systemPromptForMode,
  type BibleAiMode,
} from "@/lib/bible/rag-prompts";
import { RAG_TRANSLATIONS } from "@/lib/bible/translations";

export type { BibleAiMode };

export type BibleSource = {
  reference: string;
  content: string;
  similarity: number;
  language?: string;
  translationId?: string;
};

export type BibleHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

export type BibleAnswer = {
  answer: string;
  sources: BibleSource[];
  disclaimer: string;
  lowConfidence: boolean;
  followUps: string[];
  mode: BibleAiMode;
  rateLimit?: { remaining: number; limit: number };
};

/** Tröskel: under detta anses källorna svaga. */
export const LOW_CONFIDENCE_SIMILARITY = 0.32;
export const PROFESSOR_LOW_CONFIDENCE_SIMILARITY = 0.28;

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
  languages?: string[],
  minSimilarity = 0.2
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
         AND 1 - (embedding <=> $1::vector) >= $4
         AND ($3::text[] IS NULL OR language = ANY($3::text[]))
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [`[${embedding.join(",")}]`, limit, languages?.length ? languages : null, minSimilarity]
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
    min_similarity: minSimilarity,
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

async function mergeVectorRetrieval(
  queries: string[],
  perQueryLimit: number,
  minSimilarity: number
): Promise<ChunkRow[]> {
  const byKey = new Map<string, ChunkRow>();
  const results = await Promise.all(
    queries.map((q) => retrieveBibleChunks(q, perQueryLimit, undefined, minSimilarity).catch(() => []))
  );
  for (const batch of results) {
    for (const row of batch) {
      const key = sourceKey(row.reference, row.translationId);
      const existing = byKey.get(key);
      if (!existing || row.similarity > existing.similarity) {
        byKey.set(key, row);
      }
    }
  }
  return [...byKey.values()].sort((a, b) => b.similarity - a.similarity);
}

/**
 * Hämtar källor: vektorsökning + live HelloAO för explicita referenser.
 */
async function retrieveAllSources(
  question: string,
  locale: "sv" | "en",
  mode: BibleAiMode
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

  const minSim = mode === "professor" ? 0.17 : 0.2;
  const vectorQueries =
    mode === "professor"
      ? [
          question,
          hints.englishSearch,
          `${hints.englishSearch} ${hints.hebrewTerms.join(" ")} ${hints.greekTerms.join(" ")}`.trim(),
          `${question} biblical theology context`,
        ].filter((q) => q.length > 2)
      : [`${hints.englishSearch} ${hints.hebrewTerms.join(" ")} ${hints.greekTerms.join(" ")}`.trim()];

  const [vectorSources, livePassages] = await Promise.all([
    mergeVectorRetrieval(vectorQueries, mode === "professor" ? 10 : 12, minSim),
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

  const maxSources = mode === "professor" ? 16 : 12;
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
    .slice(0, maxSources);

  return { sources, answerLanguage: hints.answerLanguage };
}

function chatKindForMode(mode: BibleAiMode): ChatKind {
  return mode === "professor" ? "bible-professor" : "bible";
}

function chatOptionsForMode(mode: BibleAiMode) {
  return mode === "professor"
    ? { temperature: 0.22, maxTokens: 2800 }
    : { temperature: 0.32, maxTokens: 1100 };
}

function trimHistory(history: BibleHistoryTurn[] | undefined, maxTurns = 6): BibleHistoryTurn[] {
  if (!history?.length) return [];
  return history
    .filter((h) => h.content.trim().length > 0)
    .slice(-maxTurns);
}

/**
 * Genererar RAG-svar med källhänvisningar (sv/en + hebreiska/grekiska källor).
 */
export async function answerBibleQuestion(
  question: string,
  userId?: string | null,
  locale: "sv" | "en" = "sv",
  mode: BibleAiMode = "guide",
  history?: BibleHistoryTurn[]
): Promise<BibleAnswer> {
  const { sources, answerLanguage } = await retrieveAllSources(question, locale, mode);

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
      mode,
    };
  }

  const threshold =
    mode === "professor" ? PROFESSOR_LOW_CONFIDENCE_SIMILARITY : LOW_CONFIDENCE_SIMILARITY;
  const maxSimilarity = Math.max(...sources.map((s) => s.similarity));
  const lowConfidence = maxSimilarity < threshold;

  const context = sources
    .map((s, i) => {
      const langTag = s.language ? `[${s.language}] ` : "";
      return `[${i + 1}] ${langTag}${s.reference}: ${s.content}`;
    })
    .join("\n\n");

  const systemPrompt =
    systemPromptForMode(mode, answerLanguage) +
    (lowConfidence ? lowConfidenceNote(mode, answerLanguage) : "");

  const prior = trimHistory(history, mode === "professor" ? 8 : 4);
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...prior.map((h) => ({ role: h.role, content: h.content })),
    {
      role: "user",
      content: `Källor:\n${context}\n\nFråga: ${question}`,
    },
  ];

  const answer = await chatCompletion(messages, chatKindForMode(mode), chatOptionsForMode(mode));

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
        mode,
      })),
    });
  }

  const disclaimerSv =
    mode === "professor"
      ? "Bibelprofessor-läge: djupare exeges grundad på indexerade bibeltexter (Folkbibeln, BSB, hebreisk GT, SBL grekisk NT). Ersätter inte akademisk peer review, pastor eller församlingsundervisning."
      : "AI-svar grundat på public domain-bibeltexter (Folkbibeln, Berean Standard Bible, hebreisk GT, SBL grekisk NT). Ersätter inte personlig andlig vägledning eller församlingsundervisning.";
  const disclaimerEn =
    mode === "professor"
      ? "Professor mode: deeper exegesis from indexed Bible texts (Swedish Folkbibeln, BSB, Hebrew OT, SBL Greek NT). Not a substitute for academic peer review, pastoral care, or church teaching."
      : "AI answers based on public-domain Bible texts (Swedish Folkbibeln, Berean Standard Bible, Hebrew OT, SBL Greek NT). Not a substitute for personal spiritual guidance or church teaching.";

  return {
    answer,
    sources,
    disclaimer: answerLanguage === "en" ? disclaimerEn : disclaimerSv,
    lowConfidence,
    followUps: suggestBibleFollowUps(question, sources, answerLanguage, mode),
    mode,
  };
}
