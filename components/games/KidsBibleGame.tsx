"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useDict, useLocale } from "@/lib/i18n/client";
import {
  buildKidsRound,
  funFactText,
  optionLabel,
  questionText,
  type ShuffledKidsQuestion,
} from "@/lib/games/kids-bible";

type Phase = "intro" | "playing" | "finished";

const ROUND_SIZE = 8;

export function KidsBibleGame() {
  const { locale } = useLocale();
  const g = useDict().games.kidsBible;
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<ShuffledKidsQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<Set<number>>(new Set());
  const [solved, setSolved] = useState(false);
  const [pop, setPop] = useState(false);

  const start = useCallback(() => {
    setQuestions(buildKidsRound(ROUND_SIZE));
    setIndex(0);
    setStars(0);
    setWrongPicks(new Set());
    setSolved(false);
    setPop(false);
    setPhase("playing");
  }, []);

  const current = questions[index];

  function pickOption(optionIndex: number) {
    if (!current || solved) return;
    const opt = current.shuffledOptions[optionIndex];
    if (!opt || wrongPicks.has(optionIndex)) return;

    if (opt.correct) {
      setSolved(true);
      setStars((s) => s + 1);
      setPop(true);
      setTimeout(() => setPop(false), 500);
      return;
    }

    setWrongPicks((prev) => new Set(prev).add(optionIndex));
  }

  function nextQuestion() {
    if (index + 1 >= questions.length) {
      setPhase("finished");
      return;
    }
    setIndex((i) => i + 1);
    setWrongPicks(new Set());
    setSolved(false);
    setPop(false);
  }

  if (phase === "intro") {
    return (
      <div className="max-w-md mx-auto text-center px-2">
        <div
          className="text-7xl mb-6 animate-bounce"
          style={{ animationDuration: "2s" }}
          aria-hidden
        >
          🐑
        </div>
        <p className="text-lg text-stone-700 leading-relaxed mb-2 font-medium">{g.intro}</p>
        <p className="text-sm text-stone-500 mb-8">{g.parentHint}</p>
        <button
          type="button"
          onClick={start}
          className="w-full max-w-xs mx-auto min-h-[56px] px-8 py-4 rounded-2xl bg-amber-400 text-amber-950 hover:bg-amber-300 font-bold text-lg shadow-md active:scale-95 transition-transform touch-manipulation"
        >
          {g.start}
        </button>
      </div>
    );
  }

  if (phase === "finished") {
    const emoji = stars >= ROUND_SIZE ? "🏆" : stars >= ROUND_SIZE / 2 ? "🌟" : "💛";
    return (
      <div className="max-w-md mx-auto text-center px-2">
        <div className="text-7xl mb-4 animate-bounce" aria-hidden>
          {emoji}
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
            className="min-h-[56px] px-8 py-4 rounded-2xl bg-amber-400 text-amber-950 hover:bg-amber-300 font-bold text-lg shadow-md active:scale-95 transition-transform touch-manipulation"
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
        <span className="text-sm font-medium text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
          {g.roundOf.replace("{current}", String(index + 1)).replace("{total}", String(ROUND_SIZE))}
        </span>
        <span className="text-lg" aria-label={g.starsLabel}>
          {Array.from({ length: stars }, (_, i) => (
            <span key={i}>⭐</span>
          ))}
        </span>
      </div>

      <div
        className={`rounded-3xl bg-gradient-to-b from-sky-100 to-amber-50 border-2 border-amber-200 p-6 mb-6 text-center transition-transform ${
          pop ? "scale-105" : ""
        }`}
      >
        <div className="text-6xl sm:text-7xl mb-4" aria-hidden>
          {current.sceneEmoji}
        </div>
        <p className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug">
          {questionText(current, locale)}
        </p>
      </div>

      <div className="grid gap-3" role="group" aria-label={g.chooseAnswer}>
        {current.shuffledOptions.map((opt, i) => {
          const isWrong = wrongPicks.has(i);
          const isCorrect = solved && opt.correct;
          return (
            <button
              key={`${current.id}-${i}`}
              type="button"
              disabled={solved || isWrong}
              onClick={() => pickOption(i)}
              className={`min-h-[80px] sm:min-h-[88px] flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left font-semibold text-lg transition-all touch-manipulation active:scale-[0.98] ${
                isCorrect
                  ? "border-green-500 bg-green-100 text-green-900 shadow-md scale-[1.02]"
                  : isWrong
                    ? "border-stone-200 bg-stone-100 text-stone-400 opacity-60 line-through"
                    : "border-amber-300 bg-white hover:bg-amber-50 hover:border-amber-400 text-stone-800 shadow-sm"
              }`}
            >
              <span className="text-4xl shrink-0" aria-hidden>
                {opt.emoji}
              </span>
              <span>{optionLabel(opt, locale)}</span>
            </button>
          );
        })}
      </div>

      {wrongPicks.size > 0 && !solved && (
        <p className="text-center text-amber-700 font-medium mt-4 animate-pulse">{g.tryAgain}</p>
      )}

      {solved && (
        <div className="mt-6 rounded-2xl bg-olive-50 border border-olive-200 p-5 text-center">
          <p className="text-2xl mb-2" aria-hidden>
            🎉
          </p>
          <p className="font-bold text-olive-800 text-lg mb-2">{g.correct}</p>
          <p className="text-stone-600 text-sm leading-relaxed mb-5">{funFactText(current, locale)}</p>
          <button
            type="button"
            onClick={nextQuestion}
            className="w-full min-h-[52px] px-6 py-3 rounded-2xl bg-olive-600 text-parchment hover:bg-olive-700 font-bold text-lg touch-manipulation"
          >
            {index + 1 >= questions.length ? g.seeResults : g.next}
          </button>
        </div>
      )}
    </div>
  );
}
