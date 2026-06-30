import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboard } from "@/lib/games/bible-quiz-db";
import { isLocale } from "@/lib/i18n/server";
import type { LeaderboardScope } from "@/lib/games/bible-quiz-social";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const url = new URL(req.url);
  const scope = (url.searchParams.get("scope") ?? "week") as LeaderboardScope;
  const localeParam = url.searchParams.get("locale") ?? "sv";

  if (scope !== "week" && scope !== "friends") {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }
  if (!isLocale(localeParam)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  try {
    const board = await getLeaderboard(user.id, localeParam, scope);
    return NextResponse.json(board);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Leaderboard error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
