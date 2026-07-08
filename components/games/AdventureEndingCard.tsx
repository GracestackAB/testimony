"use client";

import { useState } from "react";
import {
  buildChronicleExport,
  computeEndingRank,
  rankSummary,
  rankTitle,
} from "@/lib/games/bible-adventure/endings";
import { computeAdventureStats } from "@/lib/games/bible-adventure/stats";
import type { AdventureSaveState } from "@/lib/games/bible-adventure/state";
import { useDict, useLocale } from "@/lib/i18n/client";

type Props = {
  state: AdventureSaveState;
};

export function AdventureEndingCard({ state }: Props) {
  const { locale } = useLocale();
  const t = useDict().games.bibleAdventure;
  const rank = computeEndingRank(state);
  const stats = computeAdventureStats(state);
  const [copied, setCopied] = useState(false);

  async function copyChronicle() {
    const text = buildChronicleExport(state, locale);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard may be blocked
    }
  }

  return (
    <div className="mb-6 rounded-xl border-2 border-olive-300 bg-gradient-to-b from-olive-50 to-parchment p-6 text-center">
      <p className="text-4xl mb-2" aria-hidden>
        {rank.emoji}
      </p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-olive-700 font-semibold mb-1">
        {t.endingRank}
      </p>
      <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-2">
        {rankTitle(rank, locale)}
      </h2>
      <p className="text-sm text-stone-600 leading-relaxed mb-4">{rankSummary(rank, locale)}</p>
      <div className="flex flex-wrap justify-center gap-4 text-xs text-stone-500 mb-4">
        <span>
          {t.level} {stats.level} · {stats.xp} XP
        </span>
        <span>
          {t.faithMeter}: {stats.faith}
        </span>
        <span>
          {t.healthMeter}: {stats.health}/{stats.maxHealth}
        </span>
        <span>
          {t.turn}: {stats.turns}
        </span>
        <span>
          {t.statsEnemiesDefeated}: {stats.enemiesDefeated}
        </span>
        <span>
          {t.statsAlliesMet}: {stats.alliesMet}
        </span>
        <span>
          {t.codexMilestones}: {stats.milestones}
        </span>
        <span>
          {t.codexScriptures}: {stats.scriptures}
        </span>
      </div>
      <button
        type="button"
        onClick={copyChronicle}
        className="px-5 py-2 rounded-full border border-olive-400 text-olive-800 text-sm font-medium hover:bg-olive-100 transition-colors"
      >
        {copied ? t.copiedChronicle : t.shareChronicle}
      </button>
    </div>
  );
}
