import { chatCompletion } from "@/lib/ai/client";
import type { Locale } from "@/lib/i18n/types";

export type WriteAssistKind = "testimony" | "prayer_request" | "prayer_answer" | "gratitude";

export type WriteAssistResult = {
  reflectionQuestions: string[];
  outline: string[];
  toneTip: string;
  disclaimer: string;
};

const PROMPTS: Record<Locale, Record<WriteAssistKind, string>> = {
  sv: {
    testimony:
      "Användaren skriver ett kristet vittnesbörd. Ge reflektionsfrågor och en enkel disposition — skriv INTE färdig text åt dem.",
    prayer_request:
      "Användaren skriver ett böneämne. Hjälp dem formulera tydligt vad de ber om, utan att skriva färdig text.",
    prayer_answer:
      "Användaren delar ett bönesvar. Hjälp dem strukturera kort vittnande om hur Gud svarade.",
    gratitude:
      "Användaren delar tacksamhet. Hjälp dem sätta ord på det Gud gjort — kort och äkta.",
  },
  en: {
    testimony:
      "The user is writing a Christian testimony. Give reflection questions and a simple outline — do NOT write finished text for them.",
    prayer_request:
      "The user is writing a prayer request. Help them clarify what to pray for without writing finished text.",
    prayer_answer:
      "The user shares an answered prayer. Help them structure a short witness of how God answered.",
    gratitude:
      "The user shares gratitude. Help them put words to what God has done — short and authentic.",
  },
};

const SYSTEM = (locale: Locale) => `You are a pastoral writing coach for testimony.se (${locale === "sv" ? "Swedish" : "English"}).

Rules:
1. Never invent facts about the user's life.
2. Do not write a publish-ready post — only questions, outline bullets, and one tone tip.
3. Warm, encouraging, evangelical Protestant tone.
4. Respond ONLY with valid JSON:
{
  "reflectionQuestions": ["3 short questions"],
  "outline": ["3-5 outline bullets"],
  "toneTip": "one sentence",
  "disclaimer": "short note that AI is inspiration only"
}`;

/**
 * Inspirationshjälp vid skrivande — frågor och disposition, inte färdig text.
 */
export async function assistWriting(input: {
  kind: WriteAssistKind;
  locale: Locale;
  seed?: string;
}): Promise<WriteAssistResult> {
  const lang = input.locale === "sv" ? "Svenska" : "English";
  const kindHint = PROMPTS[input.locale][input.kind];
  const seed = input.seed?.trim().slice(0, 400);

  const raw = await chatCompletion(
    [
      { role: "system", content: SYSTEM(input.locale) },
      {
        role: "user",
        content: `${kindHint}\nLanguage: ${lang}${seed ? `\n\nUser notes so far:\n${seed}` : ""}`,
      },
    ],
    "write"
  );

  return parseAssist(raw, input.locale);
}

function parseAssist(raw: string, locale: Locale): WriteAssistResult {
  const fallbackDisclaimer =
    locale === "sv"
      ? "AI-förslag — skriv med dina egna ord. Allt granskas av moderator."
      : "AI suggestions — write in your own words. Everything is reviewed by a moderator.";

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      reflectionQuestions:
        locale === "sv"
          ? ["Vad hände?", "Var såg du Gud i det?", "Vad vill du att läsaren tar med sig?"]
          : ["What happened?", "Where did you see God in it?", "What do you want readers to take away?"],
      outline: [],
      toneTip:
        locale === "sv"
          ? "Skriv som du berättar för en vän vid köksbordet."
          : "Write as if you're telling a friend at the kitchen table.",
      disclaimer: fallbackDisclaimer,
    };
  }

  try {
    const data = JSON.parse(match[0]) as Partial<WriteAssistResult>;
    return {
      reflectionQuestions: Array.isArray(data.reflectionQuestions)
        ? data.reflectionQuestions.map((q) => String(q).slice(0, 200)).slice(0, 4)
        : [],
      outline: Array.isArray(data.outline)
        ? data.outline.map((o) => String(o).slice(0, 200)).slice(0, 6)
        : [],
      toneTip: String(data.toneTip || "").slice(0, 240),
      disclaimer: String(data.disclaimer || fallbackDisclaimer).slice(0, 240),
    };
  } catch {
    return parseAssist("", locale);
  }
}
