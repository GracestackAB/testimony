import type { BibleSource } from "./rag";
import type { BibleAiMode } from "./rag-prompts";

/**
 * Föreslår naturliga uppföljningsfrågor utifrån källor (ingen extra AI-anrop).
 */
export function suggestBibleFollowUps(
  question: string,
  sources: BibleSource[],
  locale: "sv" | "en",
  mode: BibleAiMode = "guide"
): string[] {
  const refs = [...new Set(sources.map((s) => s.reference))].slice(0, 2);
  const primary = refs[0];
  const secondary = refs[1];

  if (locale === "en") {
    const items: string[] = [];
    if (mode === "professor") {
      if (primary) items.push(`Walk me through the exegesis of ${primary} step by step`);
      if (primary) items.push(`What are the key Hebrew/Greek terms in ${primary}?`);
      items.push("How does this passage connect to the gospel?");
    } else {
      if (primary) items.push(`Explain ${primary} in more depth`);
      if (secondary && primary) items.push(`How do ${primary} and ${secondary} connect?`);
      items.push("How can I apply this in daily life?");
    }
    if (!question.toLowerCase().includes("jesus")) {
      items.push("What does the Bible say about Jesus in this context?");
    }
    return [...new Set(items)].slice(0, 3);
  }

  const items: string[] = [];
  if (mode === "professor") {
    if (primary) items.push(`Gå igenom exegesen av ${primary} steg för steg`);
    if (primary) items.push(`Vilka nyckelord på originalspråket i ${primary}?`);
    items.push("Hur hänger denna text ihop med evangeliet?");
  } else {
    if (primary) items.push(`Förklara ${primary} mer i detalj`);
    if (secondary && primary) items.push(`Hur hänger ${primary} och ${secondary} ihop?`);
    items.push("Hur kan jag leva ut detta i vardagen?");
  }
  if (!question.toLowerCase().includes("jesus")) {
    items.push("Vad säger Bibeln om Jesus i det här sammanhanget?");
  }
  return [...new Set(items)].slice(0, 3);
}
