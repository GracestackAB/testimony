/**
 * Läsplan: en referens per dag (cyklar genom året).
 * Utöka med fler verser i data/bible-reading-plan.json.
 */
import plan from "@/data/bible-reading-plan.json";

export type BiblePlanEntry = { reference: string; theme?: string };

export function planEntryForDate(date: Date = new Date()): BiblePlanEntry {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const entries = plan as BiblePlanEntry[];
  return entries[dayOfYear % entries.length];
}

export interface GeneratedDailyBible {
  reference: string;
  text_body: string;
  explanation: string;
}

function parseAiJson(raw: string): GeneratedDailyBible {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  let parsed: GeneratedDailyBible;
  try {
    parsed = JSON.parse(cleaned) as GeneratedDailyBible;
  } catch {
    throw new Error("AI returnerade ogiltig JSON för bibeltext");
  }
  if (!parsed.reference || !parsed.text_body || !parsed.explanation) {
    throw new Error("Ofullständigt AI-svar för bibeltext");
  }
  return {
    reference: parsed.reference.trim(),
    text_body: parsed.text_body.trim(),
    explanation: parsed.explanation.trim(),
  };
}

/**
 * Genererar dagens bibeltext.
 * Med API.Bible: exakt källtext (engelska) + AI översätter till svenska och skriver förklaring.
 * Utan API.Bible: AI-only (fallback).
 */
export async function generateDailyBible(entry: BiblePlanEntry): Promise<GeneratedDailyBible> {
  const { chatCompletion } = await import("@/lib/ai/client");
  const { isApiBibleConfigured, fetchPassageText } = await import("@/lib/bible/api-bible");

  let sourceText: string | null = null;
  let englishRef: string | null = null;

  if (isApiBibleConfigured()) {
    try {
      const passage = await fetchPassageText(entry.reference);
      sourceText = passage.text;
      englishRef = passage.englishReference;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "unknown";
      console.warn("[daily-bible] API.Bible misslyckades, AI-only fallback:", msg);
    }
  }

  const themePart = entry.theme ? ` (tema: ${entry.theme})` : "";

  if (sourceText) {
    const raw = await chatCompletion(
      [
        {
          role: "system",
          content: `Du är bibellärare för testimony.se (kristen community, svenska).
Svara ENDAST med giltig JSON utan markdown:
{"reference":"...","text_body":"...","explanation":"..."}

Regler:
- reference: använd exakt den svenska referensen du får.
- text_body: översätt den bifogade engelska källtexten till svenska (Svenska Folkbibeln-stil). Var trogen — lägg inte till eller ta bort innebörd.
- explanation: 2–4 stycken på svenska. Historisk kontext, betydelse, praktisk tillämpning idag.
- Hitta ALDRIG på verscitat — översätt bara källtexten.`,
        },
        {
          role: "user",
          content: `Svensk referens: ${entry.reference}${themePart}
Engelsk källa (${englishRef}):
${sourceText}`,
        },
      ],
      "bible"
    );
    const parsed = parseAiJson(raw);
    return { ...parsed, reference: entry.reference };
  }

  const raw = await chatCompletion(
    [
      {
        role: "system",
        content: `Du är bibellärare för testimony.se (kristen community, svenska).
Svara ENDAST med giltig JSON utan markdown:
{"reference":"...","text_body":"...","explanation":"..."}

Regler:
- text_body: citera versen/verserna på svenska (Svenska Folkbibeln-stil). Exakt citat, inga påhittade ord.
- explanation: 2–4 stycken på svenska. Historisk kontext, vad texten betyder, praktisk tillämpning idag.
- Om du inte är säker på exakt ordalydelse: ange kända kärnord och markera osäkerhet i explanation — hitta aldrig på verscitat.
- reference: samma som begärd referens.`,
      },
      {
        role: "user",
        content: `Skapa dagens bibeltext för: ${entry.reference}${themePart}`,
      },
    ],
    "bible"
  );

  return parseAiJson(raw);
}

/**
 * Skapar eller hoppar över dagens post i daily_bible.
 */
export async function publishDailyBibleForDate(
  forDate: string,
  force = false
): Promise<{ ok: boolean; skipped?: boolean; id?: string; reference?: string; status?: string }> {
  const { createServiceClient } = await import("@/lib/supabase/server");

  const svc = await createServiceClient();
  const { data: existing } = await svc
    .from("daily_bible")
    .select("id, status")
    .eq("for_date", forDate)
    .maybeSingle();

  if (existing && !force) {
    return { ok: true, skipped: true, id: existing.id };
  }

  const entry = planEntryForDate(new Date(forDate + "T12:00:00"));
  const generated = await generateDailyBible(entry);

  const aiReview = process.env.DAILY_BIBLE_AI_REVIEW === "true";
  const status = aiReview ? ("pending" as const) : ("published" as const);

  const row = {
    for_date: forDate,
    reference: generated.reference,
    text_body: generated.text_body,
    explanation: generated.explanation,
    status,
  };

  let savedId: string;

  if (existing) {
    const { error } = await svc.from("daily_bible").update(row).eq("id", existing.id);
    if (error) throw new Error(error.message);
    savedId = existing.id;
  } else {
    const { data, error } = await svc.from("daily_bible").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    savedId = data.id;
  }

  if (aiReview) {
    const { notifyDailyBiblePendingReview } = await import("@/lib/bible/daily-notify");
    await notifyDailyBiblePendingReview(forDate, generated.reference, savedId).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : "unknown";
      console.error("[daily-bible] moderator notification failed:", msg);
    });
  }

  return { ok: true, id: savedId, reference: generated.reference, status };
}
