"use client";

import Image from "next/image";
import {
  enemyDesc,
  enemyName,
  getEnemy,
  type EnemyDef,
} from "@/lib/games/bible-adventure/enemies";
import { useDict, useLocale } from "@/lib/i18n/client";

type Props = {
  enemy: EnemyDef;
  compact?: boolean;
  enemyHealth?: number | null;
  enemyMaxHealth?: number | null;
};

export function AdventureEncounterCard({ enemy, compact, enemyHealth, enemyMaxHealth }: Props) {
  const { locale } = useLocale();
  const t = useDict().games.bibleAdventure;

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-stone-300 bg-stone-900/5 p-2">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-stone-300">
          <Image
            src={enemy.imagePath}
            alt={enemyName(enemy, locale)}
            fill
            className="object-cover object-top"
            sizes="56px"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-stone-500">{t.encounterLabel}</p>
          <p className="font-medium text-stone-900 text-sm truncate">
            {enemy.emoji} {enemyName(enemy, locale)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-300 overflow-hidden bg-stone-900/5 shadow-sm">
      <div className="relative aspect-[4/3] w-full bg-stone-200">
        <Image
          src={enemy.imagePath}
          alt={enemyName(enemy, locale)}
          fill
          className="object-cover object-top"
          sizes="(max-width: 672px) 100vw, 672px"
          priority
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-4 pb-3 pt-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/90 font-semibold">
            ⚔️ {t.encounterLabel}
          </p>
          <p className="font-serif text-lg font-semibold text-parchment">
            {enemy.emoji} {enemyName(enemy, locale)}
          </p>
        </div>
      </div>
      {enemyHealth != null && enemyMaxHealth != null && enemyMaxHealth > 0 && (
        <div className="px-4 pt-3">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-stone-500 mb-1">
            <span>{t.enemyHealth}</span>
            <span>
              {enemyHealth}/{enemyMaxHealth}
            </span>
          </div>
          <div className="h-2 rounded-full bg-stone-200 overflow-hidden mb-3">
            <div
              className="h-full bg-rose-600 transition-all duration-500"
              style={{ width: `${(enemyHealth / enemyMaxHealth) * 100}%` }}
            />
          </div>
        </div>
      )}
      <p className="px-4 py-3 text-sm text-stone-600 leading-relaxed">{enemyDesc(enemy, locale)}</p>
    </div>
  );
}

type BestiaryProps = {
  enemyIds: string[];
};

export function AdventureBestiary({ enemyIds }: BestiaryProps) {
  const { locale } = useLocale();
  const t = useDict().games.bibleAdventure;
  const enemies = enemyIds.map((id) => getEnemy(id as EnemyDef["id"])).filter(Boolean) as EnemyDef[];

  if (enemies.length === 0) return null;

  return (
    <details className="rounded-xl border border-stone-200 bg-parchment/60">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-800">
        📖 {t.bestiaryTitle} ({enemies.length})
      </summary>
      <ul className="px-4 pb-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
        {enemies.map((enemy) => (
          <li key={enemy.id} className="text-center">
            <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-lg border border-stone-300 mb-1">
              <Image
                src={enemy.imagePath}
                alt={enemyName(enemy, locale)}
                fill
                className="object-cover object-top"
                sizes="64px"
              />
            </div>
            <p className="text-[10px] text-stone-600 leading-tight">{enemyName(enemy, locale)}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
