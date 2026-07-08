"use client";

import { useEffect, useState } from "react";
import { VIRTUE_EMOJI, virtueLabel, type VirtueId } from "@/lib/games/bible-adventure/character";
import { atmosphereLine } from "@/lib/games/bible-adventure/atmosphere";
import type { AdventureSaveState, ChronicleEntry } from "@/lib/games/bible-adventure/state";
import { tensionColor, tensionLabel } from "@/lib/games/bible-adventure/tension";
import { useDict, useLocale } from "@/lib/i18n/client";

function lastRollEntry(chronicle: ChronicleEntry[]) {
  for (let i = chronicle.length - 1; i >= 0; i--) {
    const e = chronicle[i];
    if (e?.kind === "roll") return e;
  }
  return null;
}

type Props = {
  state: AdventureSaveState;
};

export function AdventureEngagementHud({ state }: Props) {
  const { locale } = useLocale();
  const t = useDict().games.bibleAdventure;
  const [diceSpin, setDiceSpin] = useState(false);
  const roll = lastRollEntry(state.chronicle);
  const atmosphere = atmosphereLine(state.scenarioId, state.turn, locale);

  useEffect(() => {
    if (!roll) return;
    setDiceSpin(true);
    const timer = setTimeout(() => setDiceSpin(false), 900);
    return () => clearTimeout(timer);
  }, [roll?.total, roll?.d20, state.turn]);

  return (
    <div className="mb-4 space-y-3">
      {state.chapterTitle && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-700 font-semibold">
            📜 {t.chapterLabel}
          </p>
          <p className="font-serif text-base font-semibold text-violet-950">{state.chapterTitle}</p>
        </div>
      )}

      <p className="text-center text-sm italic text-stone-500 px-2 leading-relaxed">{atmosphere}</p>

      <div>
        <div className="flex justify-between text-xs text-stone-500 mb-1">
          <span>{t.tensionMeter}</span>
          <span>
            {tensionLabel(state.tension, locale)} ({state.tension})
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ${tensionColor(state.tension)}`}
            style={{ width: `${state.tension}%` }}
          />
        </div>
      </div>

      {roll && (
        <div
          className={`rounded-xl border px-4 py-3 transition-transform ${
            roll.success
              ? "border-emerald-200 bg-emerald-50/80"
              : "border-amber-200 bg-amber-50/80"
          } ${diceSpin ? "scale-[1.02]" : "scale-100"}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 font-bold text-lg tabular-nums ${
                roll.critical === "nat20"
                  ? "border-amber-400 bg-amber-100 text-amber-900 animate-pulse"
                  : roll.critical === "nat1"
                    ? "border-stone-500 bg-stone-200 text-stone-800"
                    : "border-stone-300 bg-white text-stone-900"
              }`}
            >
              {roll.d20}
            </div>
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-medium text-stone-800">
                {VIRTUE_EMOJI[roll.virtue as VirtueId]}{" "}
                {virtueLabel(roll.virtue as VirtueId, locale)}
                {roll.critical === "nat20" && (
                  <span className="ml-1 text-amber-700">✨ {t.critical20}</span>
                )}
                {roll.critical === "nat1" && (
                  <span className="ml-1 text-stone-600">💫 {t.critical1}</span>
                )}
              </p>
              <p className="text-xs text-stone-600 tabular-nums">
                {roll.d20}
                {roll.d20Second ? `/${roll.d20Second}` : ""} +{roll.modifier} = {roll.total}{" "}
                {locale === "sv" ? "mot" : "vs"} {t.dcLabel} {roll.dc} —{" "}
                <span className={roll.success ? "text-emerald-700 font-medium" : "text-amber-800 font-medium"}>
                  {roll.success ? t.rollSuccess : t.rollFailure}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {state.tension >= 75 && (
        <p className="text-center text-xs text-violet-800 font-medium animate-pulse">
          ⚡ {t.highTensionHint}
        </p>
      )}
    </div>
  );
}
