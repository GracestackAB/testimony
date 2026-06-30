import { NextResponse, type NextRequest } from "next/server";
import { runWeeklyDigestCron } from "@/lib/feed/weekly-digest";
import { isAiConfigured } from "@/lib/ai/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/** Cron: måndagar — veckosammanfattning + notis till aktiva nätverksanvändare. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI-provider saknas" }, { status: 503 });
  }

  try {
    const result = await runWeeklyDigestCron();
    return NextResponse.json({ ...result, ranAt: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
