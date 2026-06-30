import { chatCompletion } from "@/lib/ai/client";

export type ModerationContentKind =
  | "testimony"
  | "prayer_request"
  | "prayer_answer"
  | "gratitude";

export type ModerationSuggestion = {
  recommendation: "approve" | "reject" | "review";
  confidence: "high" | "medium" | "low";
  summary: string;
  reasons: string[];
  flags: string[];
};

const KIND_LABELS: Record<ModerationContentKind, string> = {
  testimony: "vittnesbörd",
  prayer_request: "böneämne",
  prayer_answer: "bönesvar",
  gratitude: "tacksamhet",
};

const SYSTEM = `Du är moderator för testimony.se — en kristen community-plattform (svenska).

Uppgift: föreslå om innehåll ska godkännas, avvisas eller granskas manuellt.

GODKÄNN om:
- ärligt kristet vittnesbörd, bön eller tacksamhet
- respektfull ton mot andra
- inget uppenbart hat, spam eller reklam

AVVISA om:
- hat, hot, trakasserier
- sexuellt/explicit innehåll
- politisk propaganda utan andlig koppling
- reklam, phishing, spam
- uppenbart falska påståenden som skada

GRANSKA MANUELLT om:
- gränsfall, känslig hälsa/sjukdom utan omsorg
- teologiskt kontroversiellt men respektfullt
- otydligt om det är äkta eller troll

Svara ENDAST med giltig JSON:
{
  "recommendation": "approve" | "reject" | "review",
  "confidence": "high" | "medium" | "low",
  "summary": "en mening",
  "reasons": ["...", "..."],
  "flags": ["ev. flaggor som hate, spam, sensitive"]
}`;

/**
 * AI-förslag till moderator — beslut fattas alltid av människa.
 */
export async function suggestModerationDecision(input: {
  kind: ModerationContentKind;
  title?: string | null;
  lede?: string | null;
  body: string;
}): Promise<ModerationSuggestion> {
  const label = KIND_LABELS[input.kind];
  const text = [
    input.title ? `Titel: ${input.title}` : null,
    input.lede ? `Ingress: ${input.lede}` : null,
    `Text:\n${input.body}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const raw = await chatCompletion(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Typ: ${label}\n\n${text.slice(0, 4000)}`,
      },
    ],
    "moderation"
  );

  return parseSuggestion(raw);
}

function parseSuggestion(raw: string): ModerationSuggestion {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return fallback("review", "Kunde inte tolka AI-svar.");
  }

  try {
    const data = JSON.parse(match[0]) as Partial<ModerationSuggestion>;
    const recommendation = data.recommendation;
    if (recommendation !== "approve" && recommendation !== "reject" && recommendation !== "review") {
      return fallback("review", "AI gav oklart förslag.");
    }
    const confidence =
      data.confidence === "high" || data.confidence === "low" ? data.confidence : "medium";

    return {
      recommendation,
      confidence,
      summary: String(data.summary || "Ingen sammanfattning.").slice(0, 300),
      reasons: Array.isArray(data.reasons)
        ? data.reasons.map((r) => String(r).slice(0, 200)).slice(0, 5)
        : [],
      flags: Array.isArray(data.flags)
        ? data.flags.map((f) => String(f).slice(0, 80)).slice(0, 8)
        : [],
    };
  } catch {
    return fallback("review", "Kunde inte tolka AI-svar.");
  }
}

function fallback(recommendation: ModerationSuggestion["recommendation"], summary: string): ModerationSuggestion {
  return {
    recommendation,
    confidence: "low",
    summary,
    reasons: ["Använd eget omdöme."],
    flags: [],
  };
}
