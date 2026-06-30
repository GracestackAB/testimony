"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/profile/Avatar";
import { useDict, useLocale } from "@/lib/i18n/client";

type SearchHit = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type ChallengeItem = {
  id: string;
  status: string;
  locale: string;
  challengerScore: number | null;
  challengedScore: number | null;
  total: number;
  questionSeed?: string | null;
  role: "challenger" | "challenged";
  opponent: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

type Props = {
  activeChallengeId?: string | null;
  onActiveChallengeLoaded?: (c: ChallengeItem | null) => void;
  lastScore?: number | null;
  showChallengeForm?: boolean;
};

export function BibleQuizChallengePanel({
  activeChallengeId,
  onActiveChallengeLoaded,
  lastScore,
  showChallengeForm = false,
}: Props) {
  const { locale } = useLocale();
  const g = useDict().games.bibleQuiz;
  const router = useRouter();
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [picked, setPicked] = useState<SearchHit | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/games/bible-quiz/challenges", { cache: "no-store" });
    const data = await res.json();
    if (res.status === 401) {
      setNeedsLogin(true);
      return;
    }
    setChallenges(data.challenges ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!activeChallengeId) {
      onActiveChallengeLoaded?.(null);
      return;
    }
    void (async () => {
      const res = await fetch(
        `/api/games/bible-quiz/challenges?id=${encodeURIComponent(activeChallengeId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      onActiveChallengeLoaded?.(data.challenge ?? null);
    })();
  }, [activeChallengeId, onActiveChallengeLoaded]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      void (async () => {
        const res = await fetch(`/api/profile/search?q=${encodeURIComponent(q)}&limit=8`);
        const data = await res.json();
        setHits(data.results ?? []);
      })();
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function startPlayFirstChallenge(userId: string) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/games/bible-quiz/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengedUserId: userId, locale, playFirst: true }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || g.challengeError);
      return;
    }
    router.push(`/spel/bibel-quiz?challenge=${data.id}`);
  }

  async function sendChallengeAfterScore(e: React.FormEvent) {
    e.preventDefault();
    if (lastScore === null || lastScore === undefined || busy) return;
    const userId = picked?.id;
    if (!userId) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/games/bible-quiz/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengedUserId: userId,
        locale,
        challengerScore: lastScore,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || g.challengeError);
      return;
    }
    setMsg(g.challengeSent);
    setQuery("");
    setPicked(null);
    void load();
  }

  async function decline(challengeId: string) {
    setBusy(true);
    const res = await fetch("/api/games/bible-quiz/challenges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, action: "decline" }),
    });
    setBusy(false);
    if (res.ok) void load();
  }

  async function rematch(opponentId: string) {
    await startPlayFirstChallenge(opponentId);
  }

  const pending = challenges.filter((c) => c.status === "pending");
  const completed = challenges.filter((c) => c.status === "completed").slice(0, 10);

  function opponentName(c: ChallengeItem): string {
    return c.opponent.displayName ?? c.opponent.username ?? "?";
  }

  function pendingLabel(c: ChallengeItem): string {
    if (c.role === "challenged") {
      if (c.challengerScore === null) return g.challengeAwaitingThem;
      return g.challengeTheirScore
        .replace("{score}", String(c.challengerScore))
        .replace("{total}", String(c.total));
    }
    if (c.challengerScore === null) return g.challengeAwaitingYou;
    return g.challengeWaiting;
  }

  return (
    <div className="text-left">
      {needsLogin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm mb-4">
          {g.challengeLogin}
          <Link href="/login" className="block mt-2 font-medium text-olive-700 underline">
            {g.loginLink}
          </Link>
        </div>
      )}

      {showChallengeForm && lastScore !== null && lastScore !== undefined && !needsLogin && (
        <form onSubmit={sendChallengeAfterScore} className="mb-6 rounded-xl border border-olive-200 bg-olive-50/40 p-5">
          <p className="font-medium text-stone-900 mb-1">{g.challengeTitle}</p>
          <p className="text-sm text-stone-600 mb-4">
            {g.challengeHint.replace("{score}", String(lastScore))}
          </p>
          <p className="text-xs text-stone-500 mb-2">{g.challengeSearchHint}</p>
          <div className="relative">
            <input
              type="text"
              value={picked ? (picked.display_name ?? picked.username ?? "") : query}
              onChange={(e) => {
                setPicked(null);
                setQuery(e.target.value);
              }}
              placeholder={g.challengeSearchPlaceholder}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              required={!picked}
              minLength={2}
            />
            {!picked && hits.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-stone-200 bg-white shadow-lg max-h-48 overflow-auto">
                {hits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-olive-50 text-left"
                      onClick={() => {
                        setPicked(h);
                        setQuery("");
                        setHits([]);
                      }}
                    >
                      <Avatar src={h.avatar_url} name={h.display_name ?? h.username} size={28} />
                      <span>{h.display_name ?? h.username}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            disabled={busy || !picked}
            className="mt-3 w-full px-4 py-2 rounded-lg bg-olive-600 text-parchment text-sm font-medium hover:bg-olive-700 disabled:opacity-50"
          >
            {g.challengeSend}
          </button>
          {msg && <p className="mt-2 text-sm text-olive-700">{msg}</p>}
          {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        </form>
      )}

      {!showChallengeForm && !needsLogin && (
        <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5">
          <p className="font-medium text-stone-900 mb-1">{g.challengeTitle}</p>
          <p className="text-sm text-stone-600 mb-3">{g.challengeSearchHint}</p>
          <div className="relative">
            <input
              type="text"
              value={picked ? (picked.display_name ?? picked.username ?? "") : query}
              onChange={(e) => {
                setPicked(null);
                setQuery(e.target.value);
              }}
              placeholder={g.challengeSearchPlaceholder}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            {!picked && hits.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-stone-200 bg-white shadow-lg max-h-48 overflow-auto">
                {hits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-olive-50 text-left"
                      onClick={() => {
                        setPicked(h);
                        setQuery("");
                        setHits([]);
                      }}
                    >
                      <Avatar src={h.avatar_url} name={h.display_name ?? h.username} size={28} />
                      <span>{h.display_name ?? h.username}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            disabled={busy || !picked}
            onClick={() => picked && void startPlayFirstChallenge(picked.id)}
            className="mt-3 w-full px-4 py-2 rounded-lg bg-olive-600 text-parchment text-sm font-medium hover:bg-olive-700 disabled:opacity-50"
          >
            {g.challengeFromLeaderboard}
          </button>
        </div>
      )}

      <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500 font-semibold mb-3">
        {g.challengeInbox}
      </p>

      {pending.length === 0 ? (
        <p className="text-sm text-stone-500 py-4">{g.challengeEmpty}</p>
      ) : (
        <ul className="space-y-2 mb-8">
          {pending.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3"
            >
              <Avatar
                src={c.opponent.avatarUrl}
                name={c.opponent.displayName ?? c.opponent.username}
                size={40}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">
                  {c.role === "challenged"
                    ? g.challengeReceived.replace("{name}", opponentName(c))
                    : g.challengeSentTo.replace("{name}", opponentName(c))}
                </p>
                <p className="text-xs text-stone-500">{pendingLabel(c)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {c.role === "challenged" && c.challengerScore !== null && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void decline(c.id)}
                      className="text-xs font-medium px-2 py-1.5 rounded-full border border-stone-300 text-stone-600 hover:border-stone-400"
                    >
                      {g.challengeDecline}
                    </button>
                    <Link
                      href={`/spel/bibel-quiz?challenge=${c.id}`}
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-olive-600 text-parchment hover:bg-olive-700"
                    >
                      {g.challengeAccept}
                    </Link>
                  </>
                )}
                {c.role === "challenger" && c.challengerScore === null && (
                  <Link
                    href={`/spel/bibel-quiz?challenge=${c.id}`}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-olive-600 text-parchment hover:bg-olive-700"
                  >
                    {g.challengeAwaitingYou}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {completed.length > 0 && (
        <>
          <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500 font-semibold mb-3">
            {g.challengeHistory}
          </p>
          <ul className="space-y-2">
            {completed.map((c) => {
              const yours =
                c.role === "challenger" ? c.challengerScore : c.challengedScore;
              const theirs =
                c.role === "challenger" ? c.challengedScore : c.challengerScore;
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
                >
                  <Avatar
                    src={c.opponent.avatarUrl}
                    name={c.opponent.displayName ?? c.opponent.username}
                    size={36}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-800 truncate">
                      {g.challengeCompleted
                        .replace("{name}", opponentName(c))
                        .replace("{yours}", String(yours ?? "—"))
                        .replace("{theirs}", String(theirs ?? "—"))}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void rematch(c.opponent.id)}
                    className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border border-olive-400 text-olive-700 hover:bg-olive-50"
                  >
                    {g.challengeRematch}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export type { ChallengeItem };
