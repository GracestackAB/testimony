"use client";

import {
  canUseUltimate,
  getUltimate,
  ultimateDesc,
  ultimateName,
} from "@/lib/games/bible-adventure/ultimates";
import type { AdventureSaveState } from "@/lib/games/bible-adventure/state";
import { useDict, useLocale } from "@/lib/i18n/client";

type Props = {
  state: AdventureSaveState;
  busy?: boolean;
  onUse: () => void;
};

export function AdventureUltimateButton({ state, busy, onUse }: Props) {
  const { locale } = useLocale();
  const t = useDict().games.bibleAdventure;
  const ult = getUltimate(state.archetypeId);
  const available = canUseUltimate(state);

  if (state.ultimateUsed) {
    return (
      <p className="text-center text-xs text-stone-400 mb-2">
        {ult.emoji} {t.ultimateUsed}
      </p>
    );
  }

  if (!available) return null;

  return (
    <div className="mb-4">
      <button
        type="button"
        disabled={busy}
        onClick={onUse}
        className="w-full rounded-xl border border-violet-300 bg-gradient-to-br from-violet-50 to-amber-50/80 px-4 py-3 text-left hover:from-violet-100 hover:to-amber-100/80 transition-colors disabled:opacity-50"
      >
        <p className="text-[10px] uppercase tracking-wider text-violet-700 font-semibold mb-1">
          {ult.emoji} {t.ultimateButton}
        </p>
        <p className="font-medium text-stone-900 text-sm">{ultimateName(ult, locale)}</p>
        <p className="text-xs text-stone-600 mt-1 leading-relaxed">{ultimateDesc(ult, locale)}</p>
      </button>
      {state.ultimateBuff && (
        <p className="text-center text-xs text-violet-700 mt-2">{t.ultimateBuffActive}</p>
      )}
    </div>
  );
}
