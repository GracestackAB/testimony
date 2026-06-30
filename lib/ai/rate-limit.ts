import { createServiceClient } from "@/lib/supabase/server";

export const BIBLE_AI_HOURLY_LIMIT = 20;
export const WRITE_AI_HOURLY_LIMIT = 10;
export const STORY_GAME_HOURLY_LIMIT = 25;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetMinutes: number;
};

/**
 * Räknar AI-anrop per användare i ett glidande tidsfönster.
 */
export async function checkHourlyRateLimit(
  userId: string,
  table: "bible_ai_queries" | "ai_write_assists" | "game_story_turns",
  limit: number,
  windowHours = 1
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  if (process.env.DATABASE_URL) {
    const { getPool } = await import("@/lib/db");
    const pool = getPool();
    const res = await pool.query(
      `SELECT count(*)::int AS c FROM testimony.${table}
       WHERE user_id = $1 AND created_at >= $2`,
      [userId, since]
    );
    const used = Number(res.rows[0]?.c ?? 0);
    return buildResult(used, limit, windowHours);
  }

  const svc = await createServiceClient();
  const { count, error } = await svc
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) {
    throw new Error(error.message);
  }

  return buildResult(count ?? 0, limit, windowHours);
}

function buildResult(used: number, limit: number, windowHours: number): RateLimitResult {
  const remaining = Math.max(0, limit - used);
  return {
    allowed: used < limit,
    remaining,
    limit,
    resetMinutes: windowHours * 60,
  };
}
