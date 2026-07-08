import "server-only";
import { getPool } from "@/lib/db";
import { createServiceClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/types";
import {
  compareChallengeScores,
  DUEL_TOTAL_QUESTIONS,
  rankLeaderboardRows,
  type LeaderboardEntry,
  type LeaderboardResult,
  type LeaderboardScope,
} from "@/lib/games/youth-duel-social";

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type ScoreRow = {
  user_id: string;
  best_score: number;
  first_at: string;
};

async function fetchProfiles(ids: string[]): Promise<Map<string, ProfileRow>> {
  if (ids.length === 0) return new Map();
  const svc = await createServiceClient();
  const { data } = await svc
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);
  const map = new Map<string, ProfileRow>();
  for (const p of data ?? []) {
    map.set(p.id, p as ProfileRow);
  }
  return map;
}

function weekFilterSql(): string {
  return `played_at >= date_trunc('week', now() at time zone 'UTC')`;
}

async function queryBestScores(
  locale: Locale,
  userIds: string[] | null,
  limit: number
): Promise<ScoreRow[]> {
  const pool = getPool();
  const params: unknown[] = [locale];
  let userFilter = "";
  if (userIds && userIds.length > 0) {
    params.push(userIds);
    userFilter = `and user_id = any($${params.length}::uuid[])`;
  }
  params.push(limit);
  const res = await pool.query<ScoreRow>(
    `select user_id,
            max(score)::int as best_score,
            min(played_at) as first_at
     from testimony.youth_bible_duel_scores
     where locale = $1
       and ${weekFilterSql()}
       ${userFilter}
     group by user_id
     order by best_score desc, first_at asc
     limit $${params.length}`,
    params
  );
  return res.rows;
}

async function queryUserBestWeek(userId: string, locale: Locale): Promise<number | null> {
  const pool = getPool();
  const res = await pool.query<{ best: number | null }>(
    `select max(score)::int as best
     from testimony.youth_bible_duel_scores
     where user_id = $1 and locale = $2 and ${weekFilterSql()}`,
    [userId, locale]
  );
  return res.rows[0]?.best ?? null;
}

async function queryWeeklyRank(userId: string, locale: Locale): Promise<number | null> {
  const pool = getPool();
  const res = await pool.query<{ rank: string }>(
    `with ranked as (
       select user_id,
              max(score) as best_score,
              min(played_at) as first_at,
              rank() over (order by max(score) desc, min(played_at) asc) as r
       from testimony.youth_bible_duel_scores
       where locale = $2 and ${weekFilterSql()}
       group by user_id
     )
     select r::text as rank from ranked where user_id = $1`,
    [userId, locale]
  );
  const n = Number(res.rows[0]?.rank);
  return Number.isFinite(n) ? n : null;
}

async function queryWeeklyPlayerCount(locale: Locale): Promise<number> {
  const pool = getPool();
  const res = await pool.query<{ c: string }>(
    `select count(distinct user_id)::text as c
     from testimony.youth_bible_duel_scores
     where locale = $1 and ${weekFilterSql()}`,
    [locale]
  );
  return Number(res.rows[0]?.c ?? 0);
}

async function friendIds(userId: string): Promise<string[]> {
  const pool = getPool();
  const res = await pool.query<{ following_id: string }>(
    `select following_id from testimony.profile_follows where follower_id = $1`,
    [userId]
  );
  return [userId, ...res.rows.map((r) => r.following_id)];
}

function toEntries(
  ranked: Array<ScoreRow & { rank: number }>,
  profiles: Map<string, ProfileRow>,
  viewerId: string
): LeaderboardEntry[] {
  return ranked.map((row) => {
    const p = profiles.get(row.user_id);
    return {
      rank: row.rank,
      userId: row.user_id,
      username: p?.username ?? null,
      displayName: p?.display_name ?? null,
      avatarUrl: p?.avatar_url ?? null,
      bestScore: row.best_score,
      isYou: row.user_id === viewerId,
    };
  });
}

/**
 * Fetch weekly leaderboard (all players or friends only).
 */
export async function getLeaderboard(
  viewerId: string,
  locale: Locale,
  scope: LeaderboardScope,
  limit = 15
): Promise<LeaderboardResult> {
  const ids = scope === "friends" ? await friendIds(viewerId) : null;
  const rows = await queryBestScores(locale, ids, limit);
  const ranked = rankLeaderboardRows(rows);
  const profiles = await fetchProfiles(ranked.map((r) => r.user_id));
  const myBest = await queryUserBestWeek(viewerId, locale);
  const myRank = myBest !== null ? await queryWeeklyRank(viewerId, locale) : null;
  const totalPlayers = await queryWeeklyPlayerCount(locale);

  return {
    scope,
    locale,
    entries: toEntries(ranked, profiles, viewerId),
    myRank: myRank !== null && myBest !== null ? { rank: myRank, bestScore: myBest } : null,
    totalPlayers,
  };
}

/**
 * Record a completed quiz round and return weekly stats.
 */
export async function recordQuizScore(
  userId: string,
  locale: Locale,
  score: number,
  total = DUEL_TOTAL_QUESTIONS
): Promise<{
  personalBestWeek: number;
  isNewBest: boolean;
  weeklyRank: number | null;
  weeklyTotal: number;
}> {
  const svc = await createServiceClient();
  const prevBest = await queryUserBestWeek(userId, locale);

  await svc.from("youth_bible_duel_scores").insert({
    user_id: userId,
    locale,
    score,
    total,
  });

  const personalBestWeek = Math.max(prevBest ?? 0, score);
  const weeklyRank = await queryWeeklyRank(userId, locale);
  const weeklyTotal = await queryWeeklyPlayerCount(locale);

  return {
    personalBestWeek,
    isNewBest: prevBest === null || score > prevBest,
    weeklyRank,
    weeklyTotal,
  };
}

export async function createChallenge(input: {
  challengerId: string;
  challengedId: string;
  locale: Locale;
  challengerScore?: number | null;
}): Promise<{ id: string }> {
  const svc = await createServiceClient();
  const row: Record<string, unknown> = {
    challenger_id: input.challengerId,
    challenged_id: input.challengedId,
    locale: input.locale,
    total: DUEL_TOTAL_QUESTIONS,
    status: "pending",
  };
  if (input.challengerScore !== undefined && input.challengerScore !== null) {
    row.challenger_score = input.challengerScore;
  }

  const { data, error } = await svc
    .from("youth_bible_duel_challenges")
    .insert(row)
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "challenge_create_failed");

  const id = data.id as string;
  await svc
    .from("youth_bible_duel_challenges")
    .update({ question_seed: id })
    .eq("id", id);

  return { id };
}

/**
 * Challenger completes their round for a play-first challenge.
 */
export async function submitChallengerScore(input: {
  challengeId: string;
  userId: string;
  score: number;
}): Promise<void> {
  const svc = await createServiceClient();
  const { data: row, error } = await svc
    .from("youth_bible_duel_challenges")
    .select("*")
    .eq("id", input.challengeId)
    .maybeSingle();

  if (error || !row) throw new Error("challenge_not_found");
  if (row.challenger_id !== input.userId) throw new Error("not_challenger");
  if (row.status !== "pending") throw new Error("challenge_not_pending");
  if (row.challenger_score !== null && row.challenger_score !== undefined) {
    throw new Error("challenger_already_played");
  }

  await svc
    .from("youth_bible_duel_challenges")
    .update({ challenger_score: input.score })
    .eq("id", input.challengeId);

  await notifyChallenge({
    challengeId: input.challengeId,
    challengerId: input.userId,
    challengedId: row.challenged_id as string,
    challengerScore: input.score,
    total: row.total as number,
    locale: row.locale as Locale,
  });
}

export async function declineChallenge(input: {
  challengeId: string;
  userId: string;
}): Promise<void> {
  const svc = await createServiceClient();
  const { data: row, error } = await svc
    .from("youth_bible_duel_challenges")
    .select("challenged_id, status")
    .eq("id", input.challengeId)
    .maybeSingle();

  if (error || !row) throw new Error("challenge_not_found");
  if (row.challenged_id !== input.userId) throw new Error("not_challenged_user");
  if (row.status !== "pending") throw new Error("challenge_not_pending");

  await svc
    .from("youth_bible_duel_challenges")
    .update({ status: "declined" })
    .eq("id", input.challengeId);
}

export async function notifyChallenge(input: {
  challengeId: string;
  challengerId: string;
  challengedId: string;
  challengerScore: number;
  total: number;
  locale: Locale;
}): Promise<void> {
  const svc = await createServiceClient();
  const { data: challenger } = await svc
    .from("profiles")
    .select("display_name, username")
    .eq("id", input.challengerId)
    .maybeSingle();

  const name = challenger?.display_name ?? challenger?.username ?? "Någon";
  const title =
    input.locale === "sv"
      ? `${name} utmanar dig i Bibel-Duell!`
      : `${name} challenged you in Bibel-Duell!`;
  const body =
    input.locale === "sv"
      ? `${name} fick ${input.challengerScore}/${input.total} — kan du slå det?`
      : `${name} scored ${input.challengerScore}/${input.total} — can you beat it?`;

  await svc.from("notifications").insert({
    user_id: input.challengedId,
    type: "youth_duel_challenge",
    title,
    body,
    action_url: `/spel/bibel-duell?challenge=${input.challengeId}`,
    actor_id: input.challengerId,
    metadata: {
      challenge_id: input.challengeId,
      challenger_score: input.challengerScore,
    },
  });
}

export async function completeChallenge(input: {
  challengeId: string;
  userId: string;
  challengedScore: number;
}): Promise<{
  outcome: ReturnType<typeof compareChallengeScores>;
  challengerScore: number;
  challengedScore: number;
}> {
  const svc = await createServiceClient();
  const { data: row, error } = await svc
    .from("youth_bible_duel_challenges")
    .select("*")
    .eq("id", input.challengeId)
    .maybeSingle();

  if (error || !row) throw new Error("challenge_not_found");
  if (row.challenged_id !== input.userId) throw new Error("not_challenged_user");
  if (row.status !== "pending") throw new Error("challenge_not_pending");
  if (row.challenger_score === null || row.challenger_score === undefined) {
    throw new Error("challenger_not_played");
  }
  if (new Date(row.expires_at) < new Date()) {
    await svc.from("youth_bible_duel_challenges").update({ status: "expired" }).eq("id", input.challengeId);
    throw new Error("challenge_expired");
  }

  const outcome = compareChallengeScores(row.challenger_score, input.challengedScore);

  await svc
    .from("youth_bible_duel_challenges")
    .update({
      challenged_score: input.challengedScore,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.challengeId);

  const { data: challenged } = await svc
    .from("profiles")
    .select("display_name, username")
    .eq("id", input.userId)
    .maybeSingle();
  const chName = challenged?.display_name ?? challenged?.username ?? "Någon";

  const locale = row.locale as Locale;
  let title: string;
  let body: string;
  if (outcome === "win") {
    title = locale === "sv" ? `${chName} slog dig i Bibel-Duell!` : `${chName} beat you in Bibel-Duell!`;
    body =
      locale === "sv"
        ? `${chName}: ${input.challengedScore} — Du: ${row.challenger_score}`
        : `${chName}: ${input.challengedScore} — You: ${row.challenger_score}`;
  } else if (outcome === "lose") {
    title = locale === "sv" ? `Du vann utmaningen!` : `You won the challenge!`;
    body =
      locale === "sv"
        ? `Du: ${row.challenger_score} — ${chName}: ${input.challengedScore}`
        : `You: ${row.challenger_score} — ${chName}: ${input.challengedScore}`;
  } else {
    title = locale === "sv" ? `Oavgjort i Bibel-Duell` : `Bibel-Duell draw`;
    body =
      locale === "sv"
        ? `Båda fick ${input.challengedScore}/${row.total}`
        : `Both scored ${input.challengedScore}/${row.total}`;
  }

  await svc.from("notifications").insert({
    user_id: row.challenger_id,
    type: "youth_duel_challenge_result",
    title,
    body,
    action_url: `/spel/bibel-duell?challenge=${input.challengeId}`,
    actor_id: input.userId,
    metadata: { challenge_id: input.challengeId, outcome },
  });

  return {
    outcome,
    challengerScore: row.challenger_score,
    challengedScore: input.challengedScore,
  };
}

export type ChallengeListItem = {
  id: string;
  status: string;
  locale: Locale;
  challengerScore: number | null;
  challengedScore: number | null;
  total: number;
  questionSeed: string | null;
  createdAt: string;
  expiresAt: string;
  opponent: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  role: "challenger" | "challenged";
};

type ChallengeRow = {
  id: string;
  challenger_id: string;
  challenged_id: string;
  locale: string;
  challenger_score: number | null;
  challenged_score: number | null;
  total: number;
  question_seed: string | null;
  status: string;
  created_at: string;
  expires_at: string;
};

export async function listChallenges(userId: string): Promise<ChallengeListItem[]> {
  const svc = await createServiceClient();
  const { data } = await svc
    .from("youth_bible_duel_challenges")
    .select("*")
    .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(30);

  const rows = (data ?? []) as ChallengeRow[];
  if (!rows.length) return [];

  const opponentIds = rows.map((c) =>
    c.challenger_id === userId ? c.challenged_id : c.challenger_id
  );
  const profiles = await fetchProfiles(opponentIds);

  return rows.map((c) => {
    const isChallenger = c.challenger_id === userId;
    const oppId = isChallenger ? c.challenged_id : c.challenger_id;
    const p = profiles.get(oppId);
    return {
      id: c.id as string,
      status: c.status as string,
      locale: c.locale as Locale,
      challengerScore: (c.challenger_score as number | null) ?? null,
      challengedScore: c.challenged_score as number | null,
      total: c.total as number,
      questionSeed: (c.question_seed as string | null) ?? (c.id as string),
      createdAt: c.created_at as string,
      expiresAt: c.expires_at as string,
      opponent: {
        id: oppId,
        username: p?.username ?? null,
        displayName: p?.display_name ?? null,
        avatarUrl: p?.avatar_url ?? null,
      },
      role: isChallenger ? "challenger" : "challenged",
    };
  });
}

export async function getChallenge(
  challengeId: string,
  userId: string
): Promise<ChallengeListItem | null> {
  const items = await listChallenges(userId);
  return items.find((c) => c.id === challengeId) ?? null;
}
