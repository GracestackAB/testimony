/** Extraherar verser från HelloAO chapter JSON. */

export type HelloAoContentNode =
  | { type: "verse"; number: number; content: unknown[] }
  | { type: string; content?: unknown[]; number?: number };

export type ParsedVerse = {
  verse: number;
  text: string;
};

function flattenContent(nodes: unknown[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    if (typeof node === "string") {
      parts.push(node);
    } else if (node && typeof node === "object" && "text" in node) {
      parts.push(String((node as { text: string }).text));
    }
    // noteId, line_break etc. hoppas över
  }
  return parts.join("").replace(/\s+/g, " ").trim();
}

/**
 * Parsar HelloAO-kapitel till enskilda verser.
 */
export function parseHelloAoVerses(content: HelloAoContentNode[]): ParsedVerse[] {
  const verses: ParsedVerse[] = [];
  for (const node of content) {
    if (node.type !== "verse" || typeof node.number !== "number") continue;
    const text = flattenContent(node.content ?? []);
    if (text) verses.push({ verse: node.number, text });
  }
  return verses;
}
