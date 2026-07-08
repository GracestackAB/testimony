"use client";

import { healthLabel, MAX_REST_COUNT } from "@/lib/games/bible-adventure/health";
import {
  ARCHETYPES,
  archetypeDesc,
  archetypeName,
  getArchetype,
  virtueLabel,
  virtueModifier,
  XP_LEVEL_2,
  XP_LEVEL_3,
  VIRTUE_EMOJI,
  type VirtueId,
} from "@/lib/games/bible-adventure/character";
import type { AdventureSaveState } from "@/lib/games/bible-adventure/state";
import { useDict, useLocale } from "@/lib/i18n/client";

type Props = {
  state: AdventureSaveState;
};

const VIRTUE_IDS: VirtueId[] = ["wisdom", "courage", "compassion", "steadfastness"];

function xpToNextLevel(xp: number, level: number): number | null {
  if (level >= 3) return null;
  if (level === 1) return XP_LEVEL_2 - xp;
  return XP_LEVEL_3 - xp;
}

export function AdventureCharacterSheet({ state }: Props) {
  const { locale } = useLocale();
  const t = useDict().games.bibleAdventure;
  const arch = getArchetype(state.archetypeId);
  const xpLeft = xpToNextLevel(state.xp, state.level);

  return (
    <div className="rounded-xl border border-stone-200 bg-parchment/80 p-4">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl" aria-hidden>
          {arch?.emoji ?? "✝️"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-stone-500">{t.characterSheet}</p>
          <p className="font-serif font-semibold text-stone-900">
            {arch ? archetypeName(arch, locale) : state.archetypeId}
            <span className="text-stone-500 font-normal text-sm ml-2">
              {t.level} {state.level}
            </span>
          </p>
          {arch && (
            <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">{archetypeDesc(arch, locale)}</p>
          )}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-stone-500 mb-1">
          <span>{t.experience}</span>
          <span>
            {state.xp} XP
            {xpLeft !== null && (
              <span className="text-stone-400 normal-case tracking-normal ml-1">
                ({xpLeft} {t.xpToLevel})
              </span>
            )}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
          <div
            className="h-full bg-amber-500/80 transition-all"
            style={{
              width: `${state.level >= 3 ? 100 : state.level === 2 ? ((state.xp - XP_LEVEL_2) / (XP_LEVEL_3 - XP_LEVEL_2)) * 100 : (state.xp / XP_LEVEL_2) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-stone-600 mb-3 px-0.5">
        <span>
          ❤️ {t.healthMeter}: {state.health}/{state.maxHealth}
        </span>
        <span className="text-stone-500">{healthLabel(state.health, state.maxHealth, locale)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {VIRTUE_IDS.map((id) => {
          const val = state.virtues[id];
          const mod = virtueModifier(val);
          const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
          return (
            <div
              key={id}
              className="flex items-center justify-between rounded-lg border border-stone-200 bg-white/60 px-2.5 py-1.5 text-xs"
            >
              <span className="text-stone-700">
                {VIRTUE_EMOJI[id]} {virtueLabel(id, locale)}
              </span>
              <span className="font-medium text-stone-900 tabular-nums">
                {val}{" "}
                <span className="text-stone-400 font-normal">({modStr})</span>
              </span>
            </div>
          );
        })}
      </div>

      {state.questLog.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">{t.questLog}</p>
          <ul className="space-y-1">
            {state.questLog.map((q, i) => (
              <li key={i} className="text-xs text-stone-700 flex gap-1.5">
                <span aria-hidden>📜</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[10px] text-stone-500">
        {state.inspirationUsed ? t.inspirationUsed : t.inspirationReady}
        {" · "}
        {t.restLabel}: {state.restsUsed}/{MAX_REST_COUNT}
      </p>
    </div>
  );
}

export function AdventureArchetypePicker({
  onPick,
  busy,
}: {
  onPick: (id: (typeof ARCHETYPES)[number]["id"]) => void;
  busy: boolean;
}) {
  const { locale } = useLocale();
  const t = useDict().games.bibleAdventure;

  return (
    <ul className="space-y-3">
      {ARCHETYPES.map((arch) => (
        <li key={arch.id}>
          <button
            type="button"
            onClick={() => onPick(arch.id)}
            disabled={busy}
            className="w-full text-left flex items-start gap-4 p-5 border border-stone-200 rounded-xl bg-parchment hover:bg-olive-50/40 hover:border-olive-300 transition-colors disabled:opacity-60"
          >
            <span className="text-3xl" aria-hidden>
              {arch.emoji}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-serif text-lg font-semibold text-stone-900">
                {archetypeName(arch, locale)}
              </span>
              <span className="block text-sm text-stone-600 mt-1">{archetypeDesc(arch, locale)}</span>
              <span className="block text-xs text-olive-700 mt-2">{t.archetypeBonuses}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
