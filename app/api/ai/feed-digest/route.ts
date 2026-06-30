import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWeeklyDigest } from "@/lib/feed/weekly-digest";
import { isAiConfigured } from "@/lib/ai/client";
import type { Locale } from "@/lib/i18n/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "Veckosammanfattning är inte aktiverad ännu." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Logga in först." }, { status: 401 });
  }

  let body: { locale?: string; force?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // tom body ok
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_locale")
    .eq("id", user.id)
    .maybeSingle();

  const locale: Locale =
    body.locale === "en" || body.locale === "sv"
      ? body.locale
      : profile?.preferred_locale === "en"
        ? "en"
        : "sv";

  try {
    const result = await getOrCreateWeeklyDigest(user.id, locale, { force: body.force === true });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kunde inte skapa sammanfattning.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
