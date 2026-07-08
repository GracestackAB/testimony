"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/profile/Avatar";
import { useDict, useLocale } from "@/lib/i18n/client";
import { medalForRank, type LeaderboardEntry } from "@/lib/games/bible-quiz-social";

type Board = {
  entries: LeaderboardEntry[];
  myRank: { rank: number; bestScore: number } | null;
  totalPlayers: number;
};

export function BibleQuizLeaderboard({
  apiBase = "/api/games/bible-quiz",
  gamePath = "/spel/bibel-quiz",
  totalQuestions = 10,
}: {
  apiBase?: string;
  gamePath?: string;
  totalQuestions?: number;
} = {}) {
  const { locale } = useLocale();
  const g = useDict().games.bibleQuiz;
  const router = useRouter();
  const [scope, setScope] = useState<"week" | "friends">("week");
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [challenging, setChallenging] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `${apiBase}/leaderboard?scope=${scope}&locale=${locale}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) setErr(g.leaderboardLogin);
        else setErr(data.error || g.leaderboardError);
        setBoard(null);
        return;
      }
      setBoard(data);
    } finally {
      setLoading(false);
    }
  }, [scope, locale, g.leaderboardError, g.leaderboardLogin]);

  useEffect(() => {
    void load();
  }, [load]);

  async function challengeUser(userId: string) {
    setChallenging(userId);
    try {
      const res = await fetch(`${apiBase}/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengedUserId: userId, locale, playFirst: true }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        router.push(`${gamePath}?challenge=${data.id}`);
      }
    } finally {
      setChallenging(null);
    }
  }

  const podium = board?.entries.filter((e) => e.rank <= 3) ?? [];
  const rest = board?.entries.filter((e) => e.rank > 3) ?? [];

  return (
    <div className="text-left">
      <div className="flex rounded-full border border-stone-200 p-1 mb-6 bg-stone-50">
        {(["week", "friends"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`flex-1 py-2 px-3 rounded-full text-sm font-medium transition-colors ${
              scope === s
                ? "bg-olive-600 text-parchment shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            {s === "week" ? g.leaderboardWeek : g.leaderboardFriends}
          </button>
        ))}
      </div>

      {board?.myRank && (
        <div className="mb-6 rounded-xl border border-olive-200 bg-gradient-to-r from-olive-50 to-parchment p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-olive-700 font-semibold">
              {g.yourRank}
            </p>
            <p className="font-serif text-2xl font-semibold text-stone-900">
              #{board.myRank.rank}
              <span className="text-base font-normal text-stone-500 ml-2">
                {g.rankOf.replace("{total}", String(board.totalPlayers))}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-olive-700">{board.myRank.bestScore}</p>
            <p className="text-xs text-stone-500">/ {totalQuestions}</p>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-stone-500 text-center py-8">{g.leaderboardLoading}</p>}
      {err && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-stone-700 mb-4">
          {err}
          {err === g.leaderboardLogin && (
            <Link href="/login" className="block mt-2 font-medium text-olive-700 underline">
              {g.loginLink}
            </Link>
          )}
        </div>
      )}

      {!loading && board && board.entries.length === 0 && (
        <p className="text-sm text-stone-500 text-center py-8">{g.leaderboardEmpty}</p>
      )}

      {podium.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-6 items-end">
          {[podium[1], podium[0], podium[2]].filter(Boolean).map((entry) => {
            if (!entry) return <div key="pad" />;
            const tall = entry.rank === 1;
            return (
              <div
                key={entry.userId}
                className={`text-center rounded-xl border p-3 ${
                  entry.isYou ? "border-olive-400 bg-olive-50" : "border-stone-200 bg-white"
                } ${tall ? "pb-5 pt-4" : "pb-3"}`}
              >
                <div className="text-2xl mb-1">{medalForRank(entry.rank)}</div>
                <Avatar
                  src={entry.avatarUrl}
                  name={entry.displayName ?? entry.username}
                  size={tall ? 48 : 40}
                  className="mx-auto mb-2"
                />
                <p className="text-xs font-semibold text-stone-900 truncate">
                  {entry.isYou ? g.you : entry.displayName ?? entry.username ?? "—"}
                </p>
                <p className="text-lg font-bold text-olive-700">{entry.bestScore}</p>
              </div>
            );
          })}
        </div>
      )}

      {rest.length > 0 && (
        <ul className="space-y-2">
          {rest.map((entry) => (
            <li
              key={entry.userId}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                entry.isYou ? "border-olive-300 bg-olive-50/50" : "border-stone-200 bg-white"
              }`}
            >
              <span className="w-8 text-center text-sm font-bold text-stone-500">
                {entry.rank}
              </span>
              <Avatar src={entry.avatarUrl} name={entry.displayName ?? entry.username} size={36} />
              <span className="flex-1 min-w-0 truncate text-sm font-medium text-stone-800">
                {entry.isYou ? g.you : entry.displayName ?? entry.username}
              </span>
              {!entry.isYou && (
                <button
                  type="button"
                  disabled={challenging === entry.userId}
                  onClick={() => void challengeUser(entry.userId)}
                  className="text-xs font-medium px-2.5 py-1 rounded-full border border-olive-400 text-olive-700 hover:bg-olive-50 disabled:opacity-50"
                >
                  {g.challengeFromLeaderboard}
                </button>
              )}
              <span className="text-lg font-bold text-olive-700">{entry.bestScore}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
