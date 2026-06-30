"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useDict, useLocale } from "@/lib/i18n/client";
import {
  buildVersePuzzleRound,
  checkPuzzleAnswers,
  type VersePuzzleRound,
} from "@/lib/games/verse-puzzle";

type Phase = "intro" | "playing" | "finished";
const ROUND_SIZE = 8;

function normalize(w: string): string {
  return w.replace(/[.,;:!?""''()]/g, "").toLowerCase();
}

export function VersePuzzleGame() {
  const { locale } = useLocale();
  const g = useDict().games.versePuzzle;
  const [phase, setPhase] = useState<Phase>("intro");
  const [rounds, setRounds] = useState<VersePuzzleRound[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);

  const current = rounds[index];

  const start = useCallback(() => {
    setRounds(buildVersePuzzleRound(ROUND_SIZE, locale));
    setIndex(0);
    setScore(0);
    setAnswers({});
    setChecked(false);
    setPhase("playing");
  }, [locale]);

  useEffect(() => {
    if (phase === "intro") return;
    setRounds(buildVersePuzzleRound(ROUND_SIZE, locale));
    setIndex(0);
    setScore(0);
    setAnswers({});
    setChecked(false);
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  function assignBlank(slotIndex: number, word: string) {
    if (checked) return;
    setAnswers((prev) => {
      const next = { ...prev };
      if (next[slotIndex] === word) {
        delete next[slotIndex];
      } else {
        next[slotIndex] = word;
      }
      return next;
    });
  }

  function checkAnswer() {
    if (!current || checked) return;
    const ok = checkPuzzleAnswers(current, answers);
    setWasCorrect(ok);
    setChecked(true);
    if (ok) setScore((s) => s + 1);
  }

  function nextPuzzle() {
    if (index + 1 >= rounds.length) {
      setPhase("finished");
      return;
    }
    setIndex((i) => i + 1);
    setAnswers({});
    setChecked(false);
  }

  if (phase === "intro") {
    return (
      <div className="max-w-xl mx-auto text-center">
        <div className="text-5xl mb-4" aria-hidden>🧩</div>
        <p className="text-stone-600 leading-relaxed mb-8">{g.intro}</p>
        <button
          type="button"
          onClick={start}
          className="px-6 py-3 rounded-full bg-olive-600 text-parchment hover:bg-olive-700 font-medium"
        >
          {g.start}
        </button>
      </div>
    );
  }

  if (phase === "finished") {
    return (
      <div className="max-w-xl mx-auto text-center">
        <div className="text-5xl mb-4" aria-hidden>✨</div>
        <h2 className="font-serif text-3xl font-semibold text-stone-900 mb-2">{g.doneTitle}</h2>
        <p className="text-stone-600 mb-6">
          {g.scoreSummary.replace("{score}", String(score)).replace("{total}", String(rounds.length))}
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

  const allFilled = current.blanks.every((b) => answers[b.slotIndex]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between text-sm text-stone-500 mb-4">
        <span>{g.questionOf.replace("{current}", String(index + 1)).replace("{total}", String(rounds.length))}</span>
        <span>{g.score.replace("{score}", String(score))}</span>
      </div>

      <div className="rounded-xl border border-stone-200 bg-parchment p-6 mb-4">
        <p className="text-[10px] uppercase tracking-wider text-olive-700 font-semibold mb-3">
          {current.reference} · {current.topic}
        </p>
        <p className="font-serif text-lg leading-relaxed text-stone-900">
          {current.segments.map((seg, i) => {
            if (seg.type === "text") {
              return <span key={i}>{seg.value} </span>;
            }
            const filled = answers[seg.slotIndex];
            const correct = checked && current.blanks.find((b) => b.slotIndex === seg.slotIndex);
            let cls = "inline-block min-w-[4rem] mx-0.5 px-2 py-0.5 rounded border-b-2 border-dashed ";
            if (checked && filled && correct) {
              cls +=
                normalize(filled) === normalize(correct.word)
                  ? "border-olive-500 bg-olive-50 text-olive-900"
                  : "border-red-400 bg-red-50 text-red-900";
            } else if (filled) {
              cls += "border-olive-400 bg-olive-50/60 text-stone-900";
            } else {
              cls += "border-stone-400 text-stone-400";
            }
            return (
              <button
                key={i}
                type="button"
                disabled={checked}
                onClick={() => filled && assignBlank(seg.slotIndex, filled)}
                className={cls}
              >
                {filled ?? "___"}
              </button>
            );
          })}
        </p>
      </div>

      {!checked && (
        <div className="mb-6">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">{g.wordBank}</p>
          <div className="flex flex-wrap gap-2">
            {current.wordBank.map((word) => {
              const usedSlot = Object.entries(answers).find(([, v]) => v === word)?.[0];
              const isUsed = usedSlot !== undefined;
              return (
                <button
                  key={word}
                  type="button"
                  onClick={() => {
                    if (isUsed) {
                      assignBlank(Number(usedSlot), word);
                    } else {
                      const empty = current.blanks.find((b) => !answers[b.slotIndex]);
                      if (empty) assignBlank(empty.slotIndex, word);
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    isUsed
                      ? "border-olive-400 bg-olive-100 text-olive-800"
                      : "border-stone-200 bg-white hover:border-olive-400 hover:bg-olive-50"
                  }`}
                >
                  {word}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {checked && (
        <div
          className={`rounded-xl border p-4 mb-6 text-sm ${
            wasCorrect ? "border-olive-200 bg-olive-50" : "border-amber-200 bg-amber-50"
          }`}
        >
          <p className="font-medium text-stone-900 mb-2">{wasCorrect ? g.correct : g.incorrect}</p>
          <p className="text-stone-700 italic font-serif leading-relaxed">"{current.fullText}"</p>
        </div>
      )}

      <div className="text-center">
        {!checked ? (
          <button
            type="button"
            disabled={!allFilled}
            onClick={checkAnswer}
            className="px-6 py-3 rounded-full bg-stone-900 text-parchment font-medium disabled:opacity-40"
          >
            {g.check}
          </button>
        ) : (
          <button type="button" onClick={nextPuzzle} className="px-6 py-3 rounded-full bg-olive-600 text-parchment font-medium">
            {index + 1 >= rounds.length ? g.seeResults : g.next}
          </button>
        )}
      </div>
    </div>
  );
}
