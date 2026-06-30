import { NextResponse, type NextRequest } from "next/server";
import { publishDailyBibleForDate } from "@/lib/bible/daily";
import { isAiConfigured } from "@/lib/ai/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/** Cron: publicerar dagens bibeltext kl 05:00 UTC. */
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

  const force = request.nextUrl.searchParams.get("force") === "1";
  const dateParam = request.nextUrl.searchParams.get("date");
  const forDate = dateParam || new Date().toISOString().slice(0, 10);

  try {
    const result = await publishDailyBibleForDate(forDate, force);
    return NextResponse.json({ ...result, forDate, ranAt: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown";
    const { notifyDailyBibleFailure } = await import("@/lib/bible/daily-notify");
    await notifyDailyBibleFailure(forDate, message).catch(() => undefined);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
