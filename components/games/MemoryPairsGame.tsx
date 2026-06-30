"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useDict, useLocale } from "@/lib/i18n/client";
import {
  buildMemoryBoard,
  cardsMatch,
  isBoardComplete,
  type MemoryCard,
} from "@/lib/games/memory-pairs";

type Phase = "intro" | "playing" | "finished";
const PAIR_COUNT = 6;

export function MemoryPairsGame() {
  const { locale } = useLocale();
  const g = useDict().games.memoryPairs;
  const [phase, setPhase] = useState<Phase>("intro");
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [pairCount, setPairCount] = useState(PAIR_COUNT);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);

  const start = useCallback(() => {
    const board = buildMemoryBoard(PAIR_COUNT, locale);
    setCards(board.cards);
    setPairCount(board.pairCount);
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setLock(false);
    setPhase("playing");
  }, [locale]);

  useEffect(() => {
    if (phase !== "playing") return;
    const board = buildMemoryBoard(PAIR_COUNT, locale);
    setCards(board.cards);
    setPairCount(board.pairCount);
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
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

    if (cardsMatch(a, b)) {
      const nextMatched = new Set(matched);
      nextMatched.add(a.pairId);
      setMatched(nextMatched);
      setFlipped([]);
      if (isBoardComplete(nextMatched, pairCount)) {
        setTimeout(() => setPhase("finished"), 400);
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
      <div className="max-w-xl mx-auto text-center">
        <div className="text-5xl mb-4" aria-hidden>🃏</div>
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
        <div className="text-5xl mb-4" aria-hidden>🎉</div>
        <h2 className="font-serif text-3xl font-semibold text-stone-900 mb-2">{g.doneTitle}</h2>
        <p className="text-stone-600 mb-6">{g.doneSummary.replace("{moves}", String(moves))}</p>
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between text-sm text-stone-500 mb-4">
        <span>{g.pairsLeft.replace("{n}", String(pairCount - matched.size))}</span>
        <span>{g.moves.replace("{n}", String(moves))}</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
        {cards.map((card) => {
          const isMatched = matched.has(card.pairId);
          const isFaceUp = isMatched || flipped.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              disabled={isMatched || lock}
              onClick={() => flipCard(card.id)}
              className={`aspect-[4/3] rounded-xl border p-2 text-center flex items-center justify-center transition-all duration-300 ${
                isMatched
                  ? "border-olive-300 bg-olive-50 opacity-60"
                  : isFaceUp
                    ? "border-olive-400 bg-white shadow-sm"
                    : "border-stone-300 bg-stone-800 hover:bg-stone-700"
              }`}
            >
              {isFaceUp ? (
                <span
                  className={`text-xs sm:text-sm leading-snug ${
                    card.kind === "reference" ? "font-semibold text-olive-800" : "font-serif italic text-stone-700"
                  }`}
                >
                  {card.label}
                </span>
              ) : (
                <span className="text-parchment text-lg" aria-hidden>
                  ✦
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-stone-500 text-center mt-6">{g.hint}</p>
    </div>
  );
}
