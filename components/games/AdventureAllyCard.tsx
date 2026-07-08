"use client";

import Image from "next/image";
import { allyBonusDesc, getAllyBonus } from "@/lib/games/bible-adventure/ally-bonuses";
import {
  allyDesc,
  allyName,
  getAlly,
  type AllyDef,
} from "@/lib/games/bible-adventure/allies";
import { useDict, useLocale } from "@/lib/i18n/client";

type Props = {
  ally: AllyDef;
  compact?: boolean;
};

export function AdventureAllyCard({ ally, compact }: Props) {
  const { locale } = useLocale();
  const t = useDict().games.bibleAdventure;
  const bonus = getAllyBonus(ally.id);

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-900/5 p-2">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-emerald-300">
          <Image
            src={ally.imagePath}
            alt={allyName(ally, locale)}
            fill
            className="object-cover object-top"
            sizes="56px"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-emerald-600">{t.allyLabel}</p>
          <p className="font-medium text-stone-900 text-sm truncate">
            {ally.emoji} {allyName(ally, locale)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-300 overflow-hidden bg-emerald-900/5 shadow-sm">
      <div className="relative aspect-[4/3] w-full bg-stone-200">
        <Image
          src={ally.imagePath}
          alt={allyName(ally, locale)}
          fill
          className="object-cover object-top"
          sizes="(max-width: 672px) 100vw, 672px"
          priority
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-950/80 via-emerald-900/40 to-transparent px-4 pb-3 pt-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/90 font-semibold">
            🤝 {t.allyLabel}
          </p>
          <p className="font-serif text-lg font-semibold text-parchment">
            {ally.emoji} {allyName(ally, locale)}
          </p>
        </div>
      </div>
      <p className="px-4 py-3 text-sm text-stone-600 leading-relaxed">{allyDesc(ally, locale)}</p>
      <p className="px-4 pb-3 -mt-1 text-xs text-emerald-800 font-medium">
        ✨ {t.allyBonusLabel}: {allyBonusDesc(bonus, locale)}
      </p>
    </div>
  );
}

type RosterProps = {
  allyIds: string[];
};

export function AdventureAllyRoster({ allyIds }: RosterProps) {
  const { locale } = useLocale();
  const t = useDict().games.bibleAdventure;
  const allies = allyIds.map((id) => getAlly(id as AllyDef["id"])).filter(Boolean) as AllyDef[];

  if (allies.length === 0) return null;

  return (
    <details className="rounded-xl border border-emerald-200 bg-parchment/60">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-800">
        🤝 {t.allyRosterTitle} ({allies.length})
      </summary>
      <ul className="px-4 pb-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
        {allies.map((ally) => (
          <li key={ally.id} className="text-center">
            <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-lg border border-emerald-300 mb-1">
              <Image
                src={ally.imagePath}
                alt={allyName(ally, locale)}
                fill
                className="object-cover object-top"
                sizes="64px"
              />
            </div>
            <p className="text-[10px] text-stone-600 leading-tight">{allyName(ally, locale)}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
