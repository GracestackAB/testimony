"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useDict, useLocale } from "@/lib/i18n/client";
import {
  buildKidsSillyRound,
  explainText,
  statementText,
  type KidsSillyStatement,
} from "@/lib/games/kids-silly";

type Phase = "intro" | "playing" | "finished";

const ROUND_SIZE = 8;

export function KidsSillyGame() {
  const { locale } = useLocale();
  const g = useDict().games.kidsSilly;
  const [phase, setPhase] = useState<Phase>("intro");
  const [statements, setStatements] = useState<KidsSillyStatement[]>([]);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastPick, setLastPick] = useState<"true" | "silly" | null>(null);
  const [wrongPick, setWrongPick] = useState(false);

  const start = useCallback(() => {
    setStatements(buildKidsSillyRound(ROUND_SIZE));
    setIndex(0);
    setStars(0);
    setAnswered(false);
    setLastPick(null);
    setWrongPick(false);
    setPhase("playing");
  }, []);

  const current = statements[index];

  function answer(pick: "true" | "silly") {
    if (!current || answered) return;
    const correct = (pick === "true") === current.isTrue;
    setLastPick(pick);

    if (correct) {
      setAnswered(true);
      setStars((s) => s + 1);
      setWrongPick(false);
    } else {
      setWrongPick(true);
      setTimeout(() => setWrongPick(false), 600);
    }
  }

  function next() {
    if (index + 1 >= statements.length) {
      setPhase("finished");
      return;
    }
    setIndex((i) => i + 1);
    setAnswered(false);
    setLastPick(null);
    setWrongPick(false);
  }

  if (phase === "intro") {
    return (
      <div className="max-w-md mx-auto text-center px-2">
        <div
          className="text-7xl mb-6 animate-bounce"
          style={{ animationDuration: "2s" }}
          aria-hidden
        >
          🤔
        </div>
        <p className="text-lg text-stone-700 leading-relaxed mb-2 font-medium">{g.intro}</p>
        <p className="text-sm text-stone-500 mb-8">{g.parentHint}</p>
        <button
          type="button"
          onClick={start}
          className="w-full max-w-xs mx-auto min-h-[56px] px-8 py-4 rounded-2xl bg-emerald-400 text-emerald-950 hover:bg-emerald-300 font-bold text-lg shadow-md active:scale-95 transition-transform touch-manipulation"
        >
          {g.start}
        </button>
      </div>
    );
  }

  if (phase === "finished") {
    return (
      <div className="max-w-md mx-auto text-center px-2">
        <div className="text-7xl mb-4 animate-bounce" aria-hidden>
          🌟
        </div>
        <h2 className="font-serif text-3xl font-semibold text-stone-900 mb-2">{g.doneTitle}</h2>
        <p className="text-lg text-stone-700 mb-2">
          {g.starsEarned.replace("{n}", String(stars)).replace("{total}", String(ROUND_SIZE))}
        </p>
        <div className="flex justify-center gap-1 text-3xl mb-6" aria-label={g.starsLabel}>
          {Array.from({ length: ROUND_SIZE }, (_, i) => (
            <span key={i} className={i < stars ? "" : "opacity-25 grayscale"}>
              ⭐
            </span>
          ))}
        </div>
        <p className="text-stone-600 mb-8 leading-relaxed">{g.doneEncouragement}</p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={start}
            className="min-h-[56px] px-8 py-4 rounded-2xl bg-emerald-400 text-emerald-950 hover:bg-emerald-300 font-bold text-lg shadow-md active:scale-95 transition-transform touch-manipulation"
          >
            {g.playAgain}
          </button>
          <Link
            href="/spel"
            className="min-h-[48px] px-8 py-3 rounded-2xl border-2 border-stone-300 font-medium text-stone-700 flex items-center justify-center"
          >
            {g.backToGames}
          </Link>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="max-w-md mx-auto px-1 pb-8 select-none">
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-sm font-medium text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
          {g.roundOf.replace("{current}", String(index + 1)).replace("{total}", String(ROUND_SIZE))}
        </span>
        <span className="text-lg" aria-label={g.starsLabel}>
          {Array.from({ length: stars }, (_, i) => (
            <span key={i}>⭐</span>
          ))}
        </span>
      </div>

      <div className="rounded-3xl bg-gradient-to-b from-emerald-50 to-amber-50 border-2 border-emerald-200 p-6 mb-6 text-center">
        <div className="text-6xl sm:text-7xl mb-4" aria-hidden>
          {current.sceneEmoji}
        </div>
        <p className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug">
          {statementText(current, locale)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3" role="group" aria-label={g.chooseAnswer}>
        <button
          type="button"
          disabled={answered}
          onClick={() => answer("true")}
          className={`min-h-[100px] sm:min-h-[110px] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 font-bold text-lg transition-all touch-manipulation active:scale-[0.97] ${
            answered && lastPick === "true"
              ? current.isTrue
                ? "border-green-500 bg-green-100 text-green-900 scale-[1.02]"
                : "border-stone-200 bg-stone-100 opacity-50"
              : wrongPick && lastPick === "true"
                ? "border-red-300 bg-red-50 animate-pulse"
                : "border-green-300 bg-green-50 hover:bg-green-100 hover:border-green-400 text-green-900 shadow-sm"
          }`}
        >
          <span className="text-4xl" aria-hidden>
            👍
          </span>
          <span>{g.trueBtn}</span>
        </button>
        <button
          type="button"
          disabled={answered}
          onClick={() => answer("silly")}
          className={`min-h-[100px] sm:min-h-[110px] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 font-bold text-lg transition-all touch-manipulation active:scale-[0.97] ${
            answered && lastPick === "silly"
              ? !current.isTrue
                ? "border-amber-500 bg-amber-100 text-amber-900 scale-[1.02]"
                : "border-stone-200 bg-stone-100 opacity-50"
              : wrongPick && lastPick === "silly"
                ? "border-red-300 bg-red-50 animate-pulse"
                : "border-orange-300 bg-orange-50 hover:bg-orange-100 hover:border-orange-400 text-orange-900 shadow-sm"
          }`}
        >
          <span className="text-4xl" aria-hidden>
            🤪
          </span>
          <span>{g.sillyBtn}</span>
        </button>
      </div>

      {wrongPick && !answered && (
        <p className="text-center text-orange-700 font-medium mt-4 animate-pulse">{g.tryAgain}</p>
      )}

      {answered && (
        <div className="mt-6 rounded-2xl bg-olive-50 border border-olive-200 p-5 text-center">
          <p className="text-2xl mb-2" aria-hidden>
            {current.isTrue ? "✅" : "😄"}
          </p>
          <p className="font-bold text-olive-800 text-lg mb-2">{g.correct}</p>
          <p className="text-stone-600 text-sm leading-relaxed mb-5">
            {explainText(current, locale)}
          </p>
          <button
            type="button"
            onClick={next}
            className="w-full min-h-[52px] px-6 py-3 rounded-2xl bg-olive-600 text-parchment hover:bg-olive-700 font-bold text-lg touch-manipulation"
          >
            {index + 1 >= statements.length ? g.seeResults : g.next}
          </button>
        </div>
      )}
    </div>
  );
}
