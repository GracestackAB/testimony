"use client";

import { getAllyBonus, allyBonusDesc } from "@/lib/games/bible-adventure/ally-bonuses";
import { getUltimate, ultimateName } from "@/lib/games/bible-adventure/ultimates";
import type { AdventureSaveState } from "@/lib/games/bible-adventure/state";
import { useDict, useLocale } from "@/lib/i18n/client";

type Props = {
  state: AdventureSaveState;
};

export function AdventureBuffBar({ state }: Props) {
  const { locale } = useLocale();
  const t = useDict().games.bibleAdventure;
  const buffs: { key: string; label: string; emoji: string }[] = [];

  if (state.ultimateBuff) {
    const ult = getUltimate(state.archetypeId);
    buffs.push({
      key: "ultimate",
      emoji: ult.emoji,
      label: ultimateName(ult, locale),
    });
  }

  if (state.activeAlly) {
    const bonus = getAllyBonus(state.activeAlly);
    buffs.push({
      key: "ally",
      emoji: "🤝",
      label: allyBonusDesc(bonus, locale),
    });
  }

  if (buffs.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {buffs.map((b) => (
        <span
          key={b.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50/80 px-3 py-1 text-xs font-medium text-violet-900"
        >
          <span aria-hidden>{b.emoji}</span>
          {b.label}
        </span>
      ))}
      <span className="text-[10px] text-stone-400 self-center">{t.buffBarHint}</span>
    </div>
  );
}
