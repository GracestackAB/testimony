import { extractSwedishReferences } from "@/lib/bible/reference-extract";
import { chatCompletion } from "@/lib/ai/client";

export type BibleQueryHints = {
  englishSearch: string;
  swedishReferences: string[];
  hebrewTerms: string[];
  greekTerms: string[];
  answerLanguage: "sv" | "en";
};

/**
 * Extraherar sökledtrådar för flerspråkig bibel-RAG (sv/en + originalspråk).
 */
export async function extractBibleQueryHints(
  question: string,
  locale: "sv" | "en" = "sv"
): Promise<BibleQueryHints> {
  const localRefs = extractSwedishReferences(question);

  const raw = await chatCompletion(
    [
      {
        role: "system",
        content: `Du hjälper till att söka i Bibeln (svenska, engelska, hebreiska, grekiska).
Svara ENDAST med giltig JSON utan markdown:
{"englishSearch":"1-5 engelska nyckelord","swedishReferences":["Rom 8:1"],"hebrewTerms":[],"greekTerms":[],"answerLanguage":"sv"}

Regler:
- englishSearch: kärnbegrepp på engelska (grace, agape, logos, covenant, etc.)
- swedishReferences: explicita svenska bibelreferenser i frågan (tom array om inga)
- hebrewTerms: hebreiska nyckelord om frågan gäller GT/originalspråk (tom om ej relevant)
- greekTerms: grekiska termer om frågan gäller NT/originalspråk (tom om ej relevant)
- answerLanguage: "${locale}" om frågan är på ${locale === "sv" ? "svenska" : "engelska"}, annars det språk frågan är skriven på
- Hitta inte på referenser som inte nämns i frågan`,
      },
      { role: "user", content: question },
    ],
    "bible"
  );

  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      englishSearch?: string;
      swedishReferences?: string[];
      hebrewTerms?: string[];
      greekTerms?: string[];
      answerLanguage?: string;
    };

    const englishSearch = parsed.englishSearch?.trim() || question.slice(0, 100);
    const aiRefs = Array.isArray(parsed.swedishReferences)
      ? parsed.swedishReferences.map((r) => r.trim()).filter(Boolean)
      : [];
    const hebrewTerms = Array.isArray(parsed.hebrewTerms)
      ? parsed.hebrewTerms.map((t) => t.trim()).filter(Boolean)
      : [];
    const greekTerms = Array.isArray(parsed.greekTerms)
      ? parsed.greekTerms.map((t) => t.trim()).filter(Boolean)
      : [];

    const answerLanguage: "sv" | "en" =
      parsed.answerLanguage === "en" || parsed.answerLanguage === "sv"
        ? parsed.answerLanguage
        : locale;

    return {
      englishSearch,
      swedishReferences: [...new Set([...localRefs, ...aiRefs])],
      hebrewTerms,
      greekTerms,
      answerLanguage,
    };
  } catch {
    return {
      englishSearch: question.slice(0, 100),
      swedishReferences: localRefs,
      hebrewTerms: [],
      greekTerms: [],
      answerLanguage: locale,
    };
  }
}
