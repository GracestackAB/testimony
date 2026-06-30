import { chatCompletion } from "@/lib/ai/client";

type PassageInput = { reference: string; content: string };

/**
 * Översätter engelska bibelstycken till svenska (SFB-stil) i en batch.
 */
export async function translatePassagesToSwedish(
  passages: PassageInput[]
): Promise<Map<string, string>> {
  if (passages.length === 0) return new Map();

  const payload = passages.map((p) => ({ reference: p.reference, text: p.content }));

  const raw = await chatCompletion(
    [
      {
        role: "system",
        content: `Översätt bibelverser från engelska (CSB) till svenska (Svenska Folkbibeln-stil).
Svara ENDAST med giltig JSON-array utan markdown:
[{"reference":"Rom 8:1","text":"..."}]

Regler:
- Behåll exakt samma reference-värden som i indata
- Trogen översättning — lägg inte till eller ta bort innebörd
- En vers per objekt`,
      },
      { role: "user", content: JSON.stringify(payload) },
    ],
    "bible"
  );

  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const result = new Map<string, string>();

  try {
    const parsed = JSON.parse(cleaned) as Array<{ reference?: string; text?: string }>;
    for (const row of parsed) {
      if (row.reference && row.text) {
        result.set(row.reference, row.text.trim());
      }
    }
  } catch {
    for (const p of passages) {
      result.set(p.reference, p.content);
    }
  }

  return result;
}
