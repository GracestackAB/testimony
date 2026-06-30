import type { Locale } from "@/lib/i18n/types";

export const QUIZ_TOTAL_QUESTIONS = 10;

export type LeaderboardScope = "week" | "friends";

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bestScore: number;
  isYou: boolean;
};

export type LeaderboardResult = {
  scope: LeaderboardScope;
  locale: Locale;
  entries: LeaderboardEntry[];
  myRank: { rank: number; bestScore: number } | null;
  totalPlayers: number;
};

export type ChallengeOutcome = "win" | "lose" | "draw";

/**
 * Compare two quiz scores for a head-to-head challenge.
 */
export function compareChallengeScores(
  challengerScore: number,
  challengedScore: number
): ChallengeOutcome {
  if (challengedScore > challengerScore) return "win";
  if (challengedScore < challengerScore) return "lose";
  return "draw";
}

/** Rank rows by best score descending; ties broken by earlier play time. */
export function rankLeaderboardRows<T extends { best_score: number; first_at?: string }>(
  rows: T[]
): Array<T & { rank: number }> {
  const sorted = [...rows].sort((a, b) => {
    if (b.best_score !== a.best_score) return b.best_score - a.best_score;
    const aTime = a.first_at ? new Date(a.first_at).getTime() : 0;
    const bTime = b.first_at ? new Date(b.first_at).getTime() : 0;
    return aTime - bTime;
  });
  return sorted.map((row, i) => ({ ...row, rank: i + 1 }));
}

export function medalForRank(rank: number): string | null {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}
