import { chatCompletion } from "@/lib/ai/client";
import type { NetworkFeedItem } from "@/lib/feed/network-feed";
import type { Locale } from "@/lib/i18n/types";

export type FeedDigestResult = {
  summary: string;
  highlights: string[];
  prayerFocus: string | null;
};

const KIND_LABELS: Record<Locale, Record<NetworkFeedItem["kind"], string>> = {
  sv: {
    testimony: "vittnesbörd",
    prayer_request: "böneämne",
    prayer_answer: "bönesvar",
    gratitude: "tacksamhet",
  },
  en: {
    testimony: "testimony",
    prayer_request: "prayer request",
    prayer_answer: "answered prayer",
    gratitude: "gratitude",
  },
};

/**
 * AI-sammanfattning av nätverksflödet — pastoral ton, inga påhittade händelser.
 */
export async function generateFeedDigest(
  items: NetworkFeedItem[],
  locale: Locale,
  followingCount: number
): Promise<FeedDigestResult> {
  if (items.length === 0) {
    return {
      summary:
        locale === "sv"
          ? "Inget nytt från personer du följer den här veckan ännu. Utforska nätverket och följ fler som uppmuntrar dig."
          : "Nothing new from people you follow this week yet. Explore the network and follow others who encourage you.",
      highlights: [],
      prayerFocus: null,
    };
  }

  const labels = KIND_LABELS[locale];
  const feedText = items
    .slice(0, 25)
    .map(
      (i, n) =>
        `${n + 1}. [${labels[i.kind]}] ${i.authorName}: ${i.title}${i.body ? ` — ${i.body}` : ""}`
    )
    .join("\n");

  const lang = locale === "sv" ? "Swedish" : "English";
  const system = `You summarize a Christian social feed for testimony.se (${lang}).

Rules:
1. Only mention what appears in the feed items — never invent events.
2. Warm, pastoral tone. 2–4 short paragraphs max.
3. If prayer requests exist, add one sentence inviting the reader to pray.
4. Respond ONLY with JSON:
{
  "summary": "main text",
  "highlights": ["3–5 short bullet highlights"],
  "prayerFocus": "one prayer invitation or null"
}`;

  const raw = await chatCompletion(
    [
      { role: "system", content: system },
      {
        role: "user",
        content: `User follows ${followingCount} people. Posts this week (${items.length}):\n\n${feedText}`,
      },
    ],
    "digest"
  );

  return parseDigest(raw, locale);
}

function parseDigest(raw: string, locale: Locale): FeedDigestResult {
  const fallback =
    locale === "sv"
      ? "Ditt nätverk har delat under veckan — läs mer i flödet nedan."
      : "Your network has shared this week — read more in the feed below.";

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return { summary: fallback, highlights: [], prayerFocus: null };
  }

  try {
    const data = JSON.parse(match[0]) as Partial<FeedDigestResult>;
    return {
      summary: String(data.summary || fallback).slice(0, 2000),
      highlights: Array.isArray(data.highlights)
        ? data.highlights.map((h) => String(h).slice(0, 200)).slice(0, 6)
        : [],
      prayerFocus: data.prayerFocus ? String(data.prayerFocus).slice(0, 300) : null,
    };
  } catch {
    return { summary: fallback, highlights: [], prayerFocus: null };
  }
}
