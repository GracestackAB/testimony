"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useDict, useLocale } from "@/lib/i18n/client";
import { buildTrueFalseRound, type TrueFalseQuestion } from "@/lib/games/true-false";

type Phase = "intro" | "playing" | "finished";
const ROUND_SIZE = 10;

export function TrueFalseGame() {
  const { locale } = useLocale();
  const g = useDict().games.trueFalse;
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<TrueFalseQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);

  const current = questions[index];

  const start = useCallback(() => {
    setQuestions(buildTrueFalseRound(ROUND_SIZE, locale));
    setIndex(0);
    setScore(0);
    setPicked(null);
    setPhase("playing");
  }, [locale]);

  useEffect(() => {
    if (phase !== "playing") return;
    setQuestions(buildTrueFalseRound(ROUND_SIZE, locale));
    setIndex(0);
    setScore(0);
    setPicked(null);
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  function answer(choice: boolean) {
    if (!current || picked !== null) return;
    setPicked(choice);
    if (choice === current.isTrue) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setPhase("finished");
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  }

  if (phase === "intro") {
    return (
      <div className="max-w-xl mx-auto text-center">
        <div className="text-5xl mb-4" aria-hidden>⚖️</div>
        <p className="text-stone-600 leading-relaxed mb-8">{g.intro}</p>
        <button type="button" onClick={start} className="px-6 py-3 rounded-full bg-olive-600 text-parchment hover:bg-olive-700 font-medium">
          {g.start}
        </button>
      </div>
    );
  }

  if (phase === "finished") {
    return (
      <div className="max-w-xl mx-auto text-center">
        <div className="text-5xl mb-4" aria-hidden>🙌</div>
        <h2 className="font-serif text-3xl font-semibold text-stone-900 mb-2">{g.doneTitle}</h2>
        <p className="text-stone-600 mb-6">
          {g.scoreSummary.replace("{score}", String(score)).replace("{total}", String(questions.length))}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={start} className="px-6 py-3 rounded-full bg-olive-600 text-parchment font-medium">
            {g.playAgain}
          </button>
          <Link href="/spel" className="px-6 py-3 rounded-full border border-stone-300 font-medium">
            {g.backToGames}
          </Link>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const answered = picked !== null;
  const wasCorrect = answered && picked === current.isTrue;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between text-sm text-stone-500 mb-6">
        <span>{g.questionOf.replace("{current}", String(index + 1)).replace("{total}", String(questions.length))}</span>
        <span>{g.score.replace("{score}", String(score))}</span>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6 mb-6 text-center">
        <p className="font-serif text-xl text-stone-900 leading-relaxed">{current.statement}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {([true, false] as const).map((val) => {
          let cls = "py-4 rounded-xl border font-semibold text-lg transition-colors ";
          if (!answered) {
            cls += val
              ? "border-olive-300 bg-olive-50 hover:bg-olive-100 text-olive-800"
              : "border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800";
          } else if (val === current.isTrue) {
            cls += "border-olive-500 bg-olive-100 text-olive-900";
          } else if (picked === val) {
            cls += "border-red-400 bg-red-50 text-red-900";
          } else {
            cls += "border-stone-200 bg-stone-50 text-stone-400";
          }
          return (
            <button key={String(val)} type="button" disabled={answered} onClick={() => answer(val)} className={cls}>
              {val ? g.trueBtn : g.falseBtn}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          className={`rounded-xl border p-4 mb-6 text-sm ${
            wasCorrect ? "border-olive-200 bg-olive-50" : "border-amber-200 bg-amber-50"
          }`}
        >
          <p className="font-medium text-stone-900 mb-2">{wasCorrect ? g.correct : g.incorrect}</p>
          <p className="text-stone-700 leading-relaxed">{current.explanation}</p>
        </div>
      )}

      {answered && (
        <div className="text-center">
          <button type="button" onClick={next} className="px-6 py-3 rounded-full bg-olive-600 text-parchment font-medium">
            {index + 1 >= questions.length ? g.seeResults : g.next}
          </button>
        </div>
      )}
    </div>
  );
}
