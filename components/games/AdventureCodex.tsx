"use client";

import { getMilestone, milestoneDesc, milestoneName } from "@/lib/games/bible-adventure/milestones";
import type { AdventureSaveState } from "@/lib/games/bible-adventure/state";
import { useDict, useLocale } from "@/lib/i18n/client";

type Props = {
  state: AdventureSaveState;
};

export function AdventureCodex({ state }: Props) {
  const { locale } = useLocale();
  const t = useDict().games.bibleAdventure;
  const hasContent =
    state.scriptures.length > 0 || state.milestones.length > 0 || state.locations.length > 1;

  if (!hasContent) return null;

  return (
    <details className="rounded-xl border border-stone-200 bg-white/80 mb-4 group">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-800 list-none flex items-center justify-between">
        <span>📚 {t.codexTitle}</span>
        <span className="text-stone-400 text-xs group-open:rotate-180 transition-transform">
          ▼
        </span>
      </summary>
      <div className="px-4 pb-4 space-y-4 border-t border-stone-100 pt-3">
        {state.scriptures.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500 mb-2">
              {t.codexScriptures}
            </p>
            <ul className="space-y-1">
              {state.scriptures.map((ref) => (
                <li key={ref} className="text-sm text-olive-800">
                  📖 {ref}
                </li>
              ))}
            </ul>
          </div>
        )}
        {state.milestones.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500 mb-2">
              {t.codexMilestones}
            </p>
            <ul className="space-y-2">
              {state.milestones.map((id) => {
                const m = getMilestone(id);
                if (!m) return null;
                return (
                  <li key={id} className="flex items-start gap-2 text-sm">
                    <span aria-hidden>{m.emoji}</span>
                    <span>
                      <span className="font-medium text-stone-800">
                        {milestoneName(m, locale)}
                      </span>
                      <span className="block text-xs text-stone-500">
                        {milestoneDesc(m, locale)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {state.locations.length > 1 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500 mb-2">
              {t.codexJourney}
            </p>
            <p className="text-sm text-stone-600 leading-relaxed">
              {state.locations.join(" → ")}
            </p>
          </div>
        )}
      </div>
    </details>
  );
}
