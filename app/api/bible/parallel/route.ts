import { NextResponse } from "next/server";
import { fetchPassageAllTranslations } from "@/lib/bible/helloao";
import { RAG_TRANSLATIONS } from "@/lib/bible/translations";

export const dynamic = "force-dynamic";

/** Publik endpoint: parallella översättningar för en svensk bibelreferens. */
export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("ref")?.trim();
  if (!ref || ref.length < 3) {
    return NextResponse.json({ error: "Ange ref, t.ex. Rom 12:1" }, { status: 400 });
  }

  try {
    const passages = await fetchPassageAllTranslations(ref);
    const labelById = Object.fromEntries(RAG_TRANSLATIONS.map((t) => [t.id, t.label]));

    return NextResponse.json({
      reference: ref,
      passages: passages.map((p) => ({
        translationId: p.translationId,
        language: p.language,
        label: labelById[p.translationId] ?? p.translationId,
        reference: p.reference,
        content: p.content,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Kunde inte hämta översättningar." }, { status: 500 });
  }
}
