"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useDict, useLocale } from "@/lib/i18n/client";
import {
  buildKidsMemoryBoard,
  findPair,
  funFact,
  isKidsMemoryComplete,
  kidsMemoryCardsMatch,
  type KidsMemoryCard,
  type KidsMemoryPair,
} from "@/lib/games/kids-memory";

type Phase = "intro" | "playing" | "finished";

const PAIR_COUNT = 5;

export function KidsMemoryGame() {
  const { locale } = useLocale();
  const g = useDict().games.kidsMemory;
  const [phase, setPhase] = useState<Phase>("intro");
  const [cards, setCards] = useState<KidsMemoryCard[]>([]);
  const [pairs, setPairs] = useState<KidsMemoryPair[]>([]);
  const [pairCount, setPairCount] = useState(PAIR_COUNT);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [lastMatchFact, setLastMatchFact] = useState<string | null>(null);

  const start = useCallback(() => {
    const board = buildKidsMemoryBoard(PAIR_COUNT, locale);
    setCards(board.cards);
    setPairs(board.pairs);
    setPairCount(board.pairCount);
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setLock(false);
    setLastMatchFact(null);
    setPhase("playing");
  }, [locale]);

  useEffect(() => {
    if (phase !== "playing") return;
    const board = buildKidsMemoryBoard(PAIR_COUNT, locale);
    setCards(board.cards);
    setPairs(board.pairs);
    setPairCount(board.pairCount);
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setLastMatchFact(null);
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  function flipCard(cardId: string) {
    if (lock || phase !== "playing") return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || matched.has(card.pairId) || flipped.includes(cardId)) return;

    const nextFlipped = [...flipped, cardId];
    setFlipped(nextFlipped);

    if (nextFlipped.length < 2) return;

    setMoves((m) => m + 1);
    const [aId, bId] = nextFlipped;
    const a = cards.find((c) => c.id === aId)!;
    const b = cards.find((c) => c.id === bId)!;

    if (kidsMemoryCardsMatch(a, b)) {
      const nextMatched = new Set(matched);
      nextMatched.add(a.pairId);
      setMatched(nextMatched);
      setFlipped([]);
      const pair = findPair(pairs, a.pairId);
      if (pair) {
        setLastMatchFact(funFact(pair, locale));
        setTimeout(() => setLastMatchFact(null), 2500);
      }
      if (isKidsMemoryComplete(nextMatched, pairCount)) {
        setTimeout(() => setPhase("finished"), 600);
      }
    } else {
      setLock(true);
      setTimeout(() => {
        setFlipped([]);
        setLock(false);
      }, 900);
    }
  }

  if (phase === "intro") {
    return (
      <div className="max-w-md mx-auto text-center px-2">
        <div
          className="text-7xl mb-6 animate-bounce"
          style={{ animationDuration: "2s" }}
          aria-hidden
        >
          🎴
        </div>
        <p className="text-lg text-stone-700 leading-relaxed mb-2 font-medium">{g.intro}</p>
        <p className="text-sm text-stone-500 mb-8">{g.parentHint}</p>
        <button
          type="button"
          onClick={start}
          className="w-full max-w-xs mx-auto min-h-[56px] px-8 py-4 rounded-2xl bg-violet-400 text-violet-950 hover:bg-violet-300 font-bold text-lg shadow-md active:scale-95 transition-transform touch-manipulation"
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
          🎊
        </div>
        <h2 className="font-serif text-3xl font-semibold text-stone-900 mb-2">{g.doneTitle}</h2>
        <p className="text-lg text-stone-700 mb-8">
          {g.doneSummary.replace("{moves}", String(moves))}
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={start}
            className="min-h-[56px] px-8 py-4 rounded-2xl bg-violet-400 text-violet-950 hover:bg-violet-300 font-bold text-lg shadow-md active:scale-95 transition-transform touch-manipulation"
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

  return (
    <div className="max-w-md mx-auto px-1 pb-8 select-none">
      <div className="flex justify-between text-sm font-medium text-violet-800 mb-4 px-1">
        <span className="bg-violet-100 px-3 py-1 rounded-full">
          {g.pairsLeft.replace("{n}", String(pairCount - matched.size))}
        </span>
        <span className="bg-violet-100 px-3 py-1 rounded-full">
          {g.moves.replace("{n}", String(moves))}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {cards.map((card) => {
          const isMatched = matched.has(card.pairId);
          const isFaceUp = isMatched || flipped.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              disabled={isMatched || lock}
              onClick={() => flipCard(card.id)}
              className={`min-h-[100px] sm:min-h-[110px] rounded-2xl border-2 p-3 flex flex-col items-center justify-center transition-all duration-300 touch-manipulation active:scale-[0.97] ${
                isMatched
                  ? "border-green-400 bg-green-50 opacity-70"
                  : isFaceUp
                    ? card.kind === "person"
                      ? "border-sky-400 bg-sky-50 shadow-md"
                      : "border-amber-400 bg-amber-50 shadow-md"
                    : "border-violet-300 bg-gradient-to-br from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500"
              }`}
            >
              {isFaceUp ? (
                <>
                  <span className="text-4xl sm:text-5xl mb-1" aria-hidden>
                    {card.emoji}
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-bold text-center leading-tight ${
                      card.kind === "person" ? "text-sky-900" : "text-amber-900"
                    }`}
                  >
                    {card.label}
                  </span>
                </>
              ) : (
                <span className="text-3xl text-violet-100" aria-hidden>
                  ✨
                </span>
              )}
            </button>
          );
        })}
      </div>

      {lastMatchFact && (
        <p className="mt-5 text-center text-sm font-medium text-olive-800 bg-olive-50 border border-olive-200 rounded-2xl px-4 py-3 animate-pulse">
          🎉 {lastMatchFact}
        </p>
      )}

      <p className="text-xs text-stone-500 text-center mt-5">{g.hint}</p>
    </div>
  );
}
