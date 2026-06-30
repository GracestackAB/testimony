import { NextResponse } from "next/server";
import { processOutbox } from "@/lib/notifications/dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Triggered by Vercel cron, Azure ACA Jobs, or manually with CRON_SECRET.
function authorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth === `Bearer ${secret}`) return true;
  // Backward compat during Vercel → Azure cutover
  if (req.headers.get("x-vercel-cron")) return true;
  return false;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await processOutbox(100);
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await processOutbox(100);
  return NextResponse.json(result);
}
