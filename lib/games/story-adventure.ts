import { chatCompletion } from "@/lib/ai/client";
import type { Locale } from "@/lib/i18n/types";
import { getScenario, type StoryScenarioId } from "@/lib/games/story-scenarios";

export type StoryHistoryEntry = {
  role: "user" | "assistant";
  text: string;
};

export type StoryTurn = {
  narrative: string;
  choices: string[];
  scriptureNote: string | null;
  ended: boolean;
  reflection: string | null;
};

const MAX_HISTORY = 14;
const MAX_CHOICE_LEN = 120;
const MAX_NARRATIVE_LEN = 2200;

function systemPrompt(locale: Locale, scenarioBrief: string): string {
  const lang = locale === "sv" ? "Swedish" : "English";
  return `You are the narrative engine for testimony.se — an interactive Bible story game (${lang}).

Theology & guardrails (non-negotiable):
- Orthodox evangelical Protestant Christianity. Scripture is authoritative.
- Stay faithful to the biblical account described below. Do not contradict Scripture.
- No new revelation, no "God told me" beyond what the Bible supports.
- No anachronisms (modern tech, slang, politics).
- Portray biblical characters with respect. No mockery of faith.
- If the player chooses cruelty, immorality, or blasphemy — redirect gently in-story.
- Do not preach at length; show truth through narrative.

Scenario context:
${scenarioBrief}

Output rules:
- Write 2–3 short paragraphs in second person ("du"/"you"), immersive and vivid.
- Offer exactly 2 or 3 meaningful choices (max ${MAX_CHOICE_LEN} chars each).
- After roughly 4–7 player turns, move toward a natural ending (ended: true).
- When ended is true, choices must be empty and reflection must be a thoughtful spiritual question.
- scriptureNote: optional short Bible reference relevant to this beat (or null).

Respond ONLY with valid JSON:
{
  "narrative": "string",
  "choices": ["...", "..."],
  "scriptureNote": "string or null",
  "ended": false,
  "reflection": "string or null"
}`;
}

function buildMessages(
  locale: Locale,
  scenarioBrief: string,
  history: StoryHistoryEntry[],
  choice: string
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const trimmed = history.slice(-MAX_HISTORY);
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt(locale, scenarioBrief) },
  ];

  for (const entry of trimmed) {
    messages.push({ role: entry.role, content: entry.text });
  }

  messages.push({
    role: "user",
    content:
      locale === "sv"
        ? `Spelaren väljer: «${choice}»\n\nFortsätt berättelsen.`
        : `The player chooses: "${choice}"\n\nContinue the story.`,
  });

  return messages;
}

/**
 * Advance the interactive story by one turn via AI.
 */
export async function advanceStory(input: {
  scenarioId: StoryScenarioId;
  locale: Locale;
  choice: string;
  history: StoryHistoryEntry[];
}): Promise<StoryTurn> {
  const scenario = getScenario(input.scenarioId);
  if (!scenario) {
    throw new Error("Unknown scenario");
  }

  const choice = input.choice.trim().slice(0, MAX_CHOICE_LEN);
  if (!choice) {
    throw new Error("Empty choice");
  }

  const raw = await chatCompletion(
    buildMessages(input.locale, scenario.aiBrief[input.locale], input.history, choice),
    "write"
  );

  return parseStoryTurn(raw, input.locale);
}

/** Parse and validate AI JSON output with safe fallbacks. */
export function parseStoryTurn(raw: string, locale: Locale): StoryTurn {
  const fallbackNarrative =
    locale === "sv"
      ? "Berättelsen tystnar ett ögonblick — vinden bär böner över det heliga landskapet. Välj hur du går vidare med vishet."
      : "The story pauses — wind carries prayer over the holy landscape. Choose how you proceed with wisdom.";

  const fallbackChoices =
    locale === "sv"
      ? ["Fortsätt i tyst bön", "Sök vishet hos Herren"]
      : ["Continue in quiet prayer", "Seek wisdom from the Lord"];

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      narrative: fallbackNarrative,
      choices: fallbackChoices,
      scriptureNote: null,
      ended: false,
      reflection: null,
    };
  }

  try {
    const data = JSON.parse(match[0]) as Partial<StoryTurn>;
    const ended = Boolean(data.ended);
    const choices = ended
      ? []
      : (Array.isArray(data.choices) ? data.choices : fallbackChoices)
          .map((c) => String(c).trim().slice(0, MAX_CHOICE_LEN))
          .filter(Boolean)
          .slice(0, 3);

    if (!ended && choices.length < 2) {
      return {
        narrative: String(data.narrative || fallbackNarrative).slice(0, MAX_NARRATIVE_LEN),
        choices: fallbackChoices,
        scriptureNote: data.scriptureNote ? String(data.scriptureNote).slice(0, 120) : null,
        ended: false,
        reflection: null,
      };
    }

    return {
      narrative: String(data.narrative || fallbackNarrative).slice(0, MAX_NARRATIVE_LEN),
      choices,
      scriptureNote: data.scriptureNote ? String(data.scriptureNote).slice(0, 120) : null,
      ended,
      reflection: ended && data.reflection ? String(data.reflection).slice(0, 400) : null,
    };
  } catch {
    return {
      narrative: fallbackNarrative,
      choices: fallbackChoices,
      scriptureNote: null,
      ended: false,
      reflection: null,
    };
  }
}

export function historyFromTurns(
  turns: Array<{ narrative: string; choice?: string }>
): StoryHistoryEntry[] {
  const entries: StoryHistoryEntry[] = [];
  for (const turn of turns) {
    if (turn.narrative) {
      entries.push({ role: "assistant", text: turn.narrative });
    }
    if (turn.choice) {
      entries.push({ role: "user", text: turn.choice });
    }
  }
  return entries;
}
