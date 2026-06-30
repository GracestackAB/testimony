"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDict, useLocale } from "@/lib/i18n/client";
import {
  buildQuiz,
  buildQuizWithSeed,
  isCorrectAnswer,
  type QuizQuestion,
} from "@/lib/games/bible-quiz";
import { QUIZ_TOTAL_QUESTIONS } from "@/lib/games/bible-quiz-social";
import { BibleQuizLeaderboard } from "@/components/games/BibleQuizLeaderboard";
import {
  BibleQuizChallengePanel,
  type ChallengeItem,
} from "@/components/games/BibleQuizChallengePanel";

const QUESTIONS_PER_ROUND = QUIZ_TOTAL_QUESTIONS;

type Phase = "intro" | "playing" | "finished";
type Tab = "play" | "leaderboard" | "challenges";

type ScoreStats = {
  personalBestWeek: number;
  isNewBest: boolean;
  weeklyRank: number | null;
  weeklyTotal: number;
  challengeResult?: {
    outcome: "win" | "lose" | "draw";
    challengerScore: number;
    challengedScore: number;
  } | null;
};

function bestScoreKey(locale: string): string {
  return `testimony_bible_quiz_best_${locale}`;
}

function loadLocalBest(locale: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(bestScoreKey(locale));
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function saveLocalBest(locale: string, score: number): number {
  const prev = loadLocalBest(locale);
  if (prev === null || score > prev) {
    localStorage.setItem(bestScoreKey(locale), String(score));
    return score;
  }
  return prev;
}

function BibleQuizInner() {
  const { locale } = useLocale();
  const g = useDict().games.bibleQuiz;
  const searchParams = useSearchParams();
  const challengeParam = searchParams.get("challenge");

  const [tab, setTab] = useState<Tab>("play");
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [localBest, setLocalBest] = useState<number | null>(null);
  const [stats, setStats] = useState<ScoreStats | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const current = questions[index];
  const total = questions.length;
  const progress = total > 0 ? ((index + (picked !== null ? 1 : 0)) / total) * 100 : 0;

  const promptLabel = useMemo(() => {
    if (!current) return "";
    return current.mode === "reference" ? g.promptVerse : g.promptReference;
  }, [current, g.promptReference, g.promptVerse]);

  const resetPlay = useCallback(() => {
    setPhase("intro");
    setQuestions([]);
    setIndex(0);
    setScore(0);
    setPicked(null);
    setStats(null);
    setLocalBest(loadLocalBest(locale));
  }, [locale]);

  useEffect(() => {
    resetPlay();
  }, [locale, resetPlay]);

  useEffect(() => {
    if (!challengeParam) {
      setActiveChallenge(null);
      return;
    }
    void (async () => {
      const res = await fetch(
        `/api/games/bible-quiz/challenges?id=${encodeURIComponent(challengeParam)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setActiveChallenge(data.challenge ?? null);
    })();
  }, [challengeParam]);

  const startRound = useCallback(() => {
    const seed = activeChallenge?.questionSeed ?? activeChallenge?.id;
    const qs =
      seed && activeChallenge
        ? buildQuizWithSeed(QUESTIONS_PER_ROUND, locale, seed)
        : buildQuiz(QUESTIONS_PER_ROUND, locale);
    setQuestions(qs);
    setIndex(0);
    setScore(0);
    setPicked(null);
    setStats(null);
    setPhase("playing");
    setLocalBest(loadLocalBest(locale));
    setTab("play");
  }, [locale, activeChallenge]);

  const submitScore = useCallback(
    async (finalScore: number) => {
      setSubmitting(true);
      try {
        const isChallengerPlay =
          activeChallenge?.role === "challenger" &&
          activeChallenge.status === "pending" &&
          activeChallenge.challengerScore === null;

        const res = await fetch("/api/games/bible-quiz/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score: finalScore,
            locale,
            challengeId: activeChallenge?.id,
            asChallenger: isChallengerPlay || undefined,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setStats(data as ScoreStats);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [locale, activeChallenge]
  );

  const pickOption = (optionIndex: number) => {
    if (picked !== null || !current) return;
    setPicked(optionIndex);
    if (isCorrectAnswer(current, optionIndex)) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (index + 1 >= total) {
      const finalScore = score + (picked !== null && current && isCorrectAnswer(current, picked) ? 0 : 0);
      // score already updated on pick
      setLocalBest(saveLocalBest(locale, score));
      setPhase("finished");
      void submitScore(score);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "play", label: g.tabPlay },
    { id: "leaderboard", label: g.tabLeaderboard },
    { id: "challenges", label: g.tabChallenges },
  ];

  if (phase === "intro") {
    return (
      <div>
        {activeChallenge?.role === "challenged" &&
          activeChallenge.status === "pending" &&
          activeChallenge.challengerScore !== null && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-center">
            <p className="font-medium text-stone-900">{g.challengeBannerTitle}</p>
            <p className="text-sm text-stone-600 mt-1">
              {g.challengeBannerBody
                .replace("{name}", activeChallenge.opponent.displayName ?? activeChallenge.opponent.username ?? "?")
                .replace("{score}", String(activeChallenge.challengerScore))
                .replace("{total}", String(activeChallenge.total))}
            </p>
          </div>
        )}

        {activeChallenge?.role === "challenger" &&
          activeChallenge.status === "pending" &&
          activeChallenge.challengerScore === null && (
          <div className="mb-6 rounded-xl border border-olive-300 bg-olive-50 p-4 text-center">
            <p className="font-medium text-stone-900">{g.challengePlayFirst}</p>
          </div>
        )}

        <div className="flex rounded-full border border-stone-200 p-1 mb-8 bg-stone-50">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 px-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                tab === t.id ? "bg-olive-600 text-parchment shadow-sm" : "text-stone-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "play" && (
          <div className="max-w-xl mx-auto text-center">
            <div className="text-5xl mb-4" aria-hidden>
              📖
            </div>
            <p className="text-stone-600 leading-relaxed mb-8">{g.intro}</p>
            <button
              type="button"
              onClick={startRound}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-olive-600 text-parchment hover:bg-olive-700 font-medium transition-colors shadow-sm"
            >
              {activeChallenge?.status === "pending" && activeChallenge.challengerScore === null
                ? g.challengeAwaitingYou
                : activeChallenge?.status === "pending"
                  ? g.challengeStart
                  : g.start}
            </button>
            {loadLocalBest(locale) !== null && (
              <p className="mt-6 text-sm text-stone-500">
                {g.bestScore.replace("{n}", String(loadLocalBest(locale)))}
              </p>
            )}
          </div>
        )}

        {tab === "leaderboard" && <BibleQuizLeaderboard />}
        {tab === "challenges" && (
          <BibleQuizChallengePanel
            activeChallengeId={challengeParam}
            onActiveChallengeLoaded={setActiveChallenge}
          />
        )}
      </div>
    );
  }

  if (phase === "finished") {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const cr = stats?.challengeResult;

    return (
      <div className="max-w-xl mx-auto text-center">
        <div className="text-5xl mb-4" aria-hidden>
          {cr?.outcome === "win" ? "🏆" : cr?.outcome === "lose" ? "💪" : pct >= 80 ? "🙌" : "✨"}
        </div>
        <h2 className="font-serif text-3xl font-semibold text-stone-900 mb-2">{g.doneTitle}</h2>
        <p className="text-stone-600 mb-2">
          {g.scoreSummary.replace("{score}", String(score)).replace("{total}", String(total))}
        </p>

        {stats?.isNewBest && (
          <p className="text-sm font-medium text-olive-700 mb-2">{g.newWeeklyBest}</p>
        )}
        {stats?.weeklyRank && (
          <p className="text-sm text-stone-500 mb-4">
            {g.weeklyRank
              .replace("{rank}", String(stats.weeklyRank))
              .replace("{total}", String(stats.weeklyTotal))}
          </p>
        )}

        {cr && (
          <div
            className={`mb-6 rounded-xl border p-5 ${
              cr.outcome === "win"
                ? "border-olive-300 bg-olive-50"
                : cr.outcome === "lose"
                  ? "border-stone-300 bg-stone-50"
                  : "border-amber-200 bg-amber-50"
            }`}
          >
            <p className="font-serif text-xl font-semibold text-stone-900">
              {cr.outcome === "win"
                ? g.challengeWon
                : cr.outcome === "lose"
                  ? g.challengeLost
                  : g.challengeDraw}
            </p>
            <p className="text-sm text-stone-600 mt-1">
              {g.challengeResultScores
                .replace("{yours}", String(cr.challengedScore))
                .replace("{theirs}", String(cr.challengerScore))}
            </p>
          </div>
        )}

        {localBest !== null && (
          <p className="text-sm text-stone-500 mb-6">
            {g.bestScore.replace("{n}", String(localBest))}
          </p>
        )}

        <p className="text-stone-700 leading-relaxed mb-6">{g.doneEncouragement}</p>

        <BibleQuizChallengePanel lastScore={score} showChallengeForm={!cr} />

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <button
            type="button"
            onClick={startRound}
            disabled={submitting}
            className="px-6 py-3 rounded-full bg-olive-600 text-parchment hover:bg-olive-700 font-medium transition-colors"
          >
            {g.playAgain}
          </button>
          <button
            type="button"
            onClick={() => {
              setPhase("intro");
              setTab("leaderboard");
            }}
            className="px-6 py-3 rounded-full border border-stone-300 text-stone-800 hover:border-olive-500 font-medium transition-colors"
          >
            {g.viewLeaderboard}
          </button>
          <Link
            href="/spel"
            className="px-6 py-3 rounded-full border border-stone-300 text-stone-800 hover:border-olive-500 font-medium transition-colors"
          >
            {g.backToGames}
          </Link>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const answered = picked !== null;
  const wasCorrect = answered && isCorrectAnswer(current, picked);

  return (
    <div className="max-w-2xl mx-auto">
      {activeChallenge?.status === "pending" && activeChallenge.challengerScore !== null && (
        <div className="mb-4 text-center text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3">
          {g.challengeInPlay}
        </div>
      )}
      <div className="flex items-center justify-between gap-4 mb-6 text-sm text-stone-500">
        <span>
          {g.questionOf.replace("{current}", String(index + 1)).replace("{total}", String(total))}
        </span>
        <span>{g.score.replace("{score}", String(score))}</span>
      </div>

      <div className="h-1.5 rounded-full bg-stone-200 mb-8 overflow-hidden">
        <div
          className="h-full bg-olive-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="rounded-xl border border-stone-200 bg-parchment p-6 mb-6">
        <p className="text-[10px] uppercase tracking-[0.15em] text-olive-700 font-semibold mb-3">
          {promptLabel}
        </p>
        <p className="font-serif text-xl md:text-2xl text-stone-900 leading-relaxed">
          {current.prompt}
        </p>
      </div>

      <ul className="space-y-3 mb-6" role="listbox" aria-label={g.chooseAnswer}>
        {current.options.map((option, i) => {
          const isPicked = picked === i;
          const isRight = i === current.correctIndex;
          let cls =
            "w-full text-left p-4 rounded-xl border transition-all font-medium ";
          if (!answered) {
            cls +=
              "border-stone-200 bg-white hover:border-olive-400 hover:bg-olive-50/50 text-stone-800";
          } else if (isRight) {
            cls += "border-olive-500 bg-olive-50 text-stone-900";
          } else if (isPicked) {
            cls += "border-red-300 bg-red-50 text-stone-900";
          } else {
            cls += "border-stone-200 bg-stone-50 text-stone-500";
          }
          return (
            <li key={`${current.id}-${i}`}>
              <button
                type="button"
                disabled={answered}
                onClick={() => pickOption(i)}
                className={cls}
                role="option"
                aria-selected={isPicked}
              >
                {option}
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <div
          className={`rounded-xl border p-5 mb-6 ${
            wasCorrect ? "border-olive-200 bg-olive-50/60" : "border-amber-200 bg-amber-50/60"
          }`}
        >
          <p className="font-medium text-stone-900 mb-1">
            {wasCorrect ? g.correct : g.incorrect}
          </p>
          <p className="text-sm text-stone-600 mb-2">
            <span className="font-semibold text-stone-800">{current.passage.reference}</span>
            {current.passage.topic ? ` · ${current.passage.topic}` : ""}
          </p>
          <p className="text-sm text-stone-700 leading-relaxed italic">
            &ldquo;{current.passage.content}&rdquo;
          </p>
        </div>
      )}

      {answered && (
        <div className="text-center">
          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-3 rounded-full bg-stone-900 text-parchment hover:bg-stone-800 font-medium transition-colors"
          >
            {index + 1 >= total ? g.seeResults : g.next}
          </button>
        </div>
      )}
    </div>
  );
}

export function BibleQuiz() {
  return (
    <Suspense fallback={<p className="text-center text-stone-500 text-sm">…</p>}>
      <BibleQuizInner />
    </Suspense>
  );
}
