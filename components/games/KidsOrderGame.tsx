"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useDict, useLocale } from "@/lib/i18n/client";
import {
  buildKidsOrderRound,
  isCorrectOrder,
  stepLabel,
  storyFunFact,
  storyTitle,
  type KidsOrderRound,
  type ShuffledStoryStep,
} from "@/lib/games/kids-order";

type Phase = "intro" | "playing" | "finished";

const ROUND_SIZE = 4;

export function KidsOrderGame() {
  const { locale } = useLocale();
  const g = useDict().games.kidsOrder;
  const [phase, setPhase] = useState<Phase>("intro");
  const [rounds, setRounds] = useState<KidsOrderRound[]>([]);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [picked, setPicked] = useState<ShuffledStoryStep[]>([]);
  const [solved, setSolved] = useState(false);
  const [wrongShake, setWrongShake] = useState(false);

  const start = useCallback(() => {
    setRounds(buildKidsOrderRound(ROUND_SIZE));
    setIndex(0);
    setStars(0);
    setPicked([]);
    setSolved(false);
    setWrongShake(false);
    setPhase("playing");
  }, []);

  const current = rounds[index];

  function tapStep(step: ShuffledStoryStep) {
    if (!current || solved || picked.some((p) => p.key === step.key)) return;

    const next = [...picked, step];
    setPicked(next);

    if (next.length < 3) return;

    if (isCorrectOrder(next)) {
      setSolved(true);
      setStars((s) => s + 1);
    } else {
      setWrongShake(true);
      setTimeout(() => {
        setPicked([]);
        setWrongShake(false);
      }, 700);
    }
  }

  function nextStory() {
    if (index + 1 >= rounds.length) {
      setPhase("finished");
      return;
    }
    setIndex((i) => i + 1);
    setPicked([]);
    setSolved(false);
    setWrongShake(false);
  }

  if (phase === "intro") {
    return (
      <div className="max-w-md mx-auto text-center px-2">
        <div
          className="text-7xl mb-6 animate-bounce"
          style={{ animationDuration: "2s" }}
          aria-hidden
        >
          📖
        </div>
        <p className="text-lg text-stone-700 leading-relaxed mb-2 font-medium">{g.intro}</p>
        <p className="text-sm text-stone-500 mb-8">{g.parentHint}</p>
        <button
          type="button"
          onClick={start}
          className="w-full max-w-xs mx-auto min-h-[56px] px-8 py-4 rounded-2xl bg-sky-400 text-sky-950 hover:bg-sky-300 font-bold text-lg shadow-md active:scale-95 transition-transform touch-manipulation"
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
          🏅
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
            className="min-h-[56px] px-8 py-4 rounded-2xl bg-sky-400 text-sky-950 hover:bg-sky-300 font-bold text-lg shadow-md active:scale-95 transition-transform touch-manipulation"
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

  const pickIndex = (step: ShuffledStoryStep) => picked.findIndex((p) => p.key === step.key);

  return (
    <div className="max-w-md mx-auto px-1 pb-8 select-none">
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-sm font-medium text-sky-800 bg-sky-100 px-3 py-1 rounded-full">
          {g.roundOf.replace("{current}", String(index + 1)).replace("{total}", String(ROUND_SIZE))}
        </span>
        <span className="text-lg" aria-label={g.starsLabel}>
          {Array.from({ length: stars }, (_, i) => (
            <span key={i}>⭐</span>
          ))}
        </span>
      </div>

      <div className="rounded-3xl bg-gradient-to-b from-sky-50 to-emerald-50 border-2 border-sky-200 p-5 mb-5 text-center">
        <p className="text-xs uppercase tracking-widest text-sky-600 mb-1">{g.storyLabel}</p>
        <h2 className="text-2xl font-bold text-stone-900">{storyTitle(current.story, locale)}</h2>
        <p className="text-sm text-stone-600 mt-2">{g.tapInOrder}</p>
      </div>

      <div
        className={`grid gap-3 ${wrongShake ? "animate-pulse" : ""}`}
        role="group"
        aria-label={g.tapInOrder}
      >
        {current.shuffledSteps.map((step) => {
          const pos = pickIndex(step);
          const isPicked = pos >= 0;
          return (
            <button
              key={step.key}
              type="button"
              disabled={solved || isPicked}
              onClick={() => tapStep(step)}
              className={`min-h-[88px] flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left font-semibold transition-all touch-manipulation active:scale-[0.98] ${
                solved && isPicked
                  ? "border-green-500 bg-green-50 text-green-900"
                  : isPicked
                    ? "border-sky-500 bg-sky-100 text-sky-900"
                    : wrongShake
                      ? "border-red-300 bg-red-50"
                      : "border-stone-200 bg-white hover:border-sky-300 hover:bg-sky-50 text-stone-800 shadow-sm"
              }`}
            >
              <span className="text-4xl shrink-0" aria-hidden>
                {step.emoji}
              </span>
              <span className="flex-1 text-base leading-snug">{stepLabel(step, locale)}</span>
              {isPicked && (
                <span className="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
                  {pos + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {wrongShake && <p className="text-center text-red-600 font-medium mt-4">{g.tryAgain}</p>}

      {solved && (
        <div className="mt-6 rounded-2xl bg-olive-50 border border-olive-200 p-5 text-center">
          <p className="text-2xl mb-2" aria-hidden>
            🎉
          </p>
          <p className="font-bold text-olive-800 text-lg mb-2">{g.correct}</p>
          <p className="text-stone-600 text-sm leading-relaxed mb-5">
            {storyFunFact(current.story, locale)}
          </p>
          <button
            type="button"
            onClick={nextStory}
            className="w-full min-h-[52px] px-6 py-3 rounded-2xl bg-olive-600 text-parchment hover:bg-olive-700 font-bold text-lg touch-manipulation"
          >
            {index + 1 >= rounds.length ? g.seeResults : g.next}
          </button>
        </div>
      )}
    </div>
  );
}
