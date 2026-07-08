"use client";

import { canUseItem, ITEM_USE_EFFECTS } from "@/lib/games/bible-adventure/item-effects";
import { getItem, itemDesc, itemName } from "@/lib/games/bible-adventure/items";
import type { AdventureSaveState } from "@/lib/games/bible-adventure/state";
import { useDict, useLocale } from "@/lib/i18n/client";

type Props = {
  state: AdventureSaveState;
  inventory: string[];
  selectedItem: string | null;
  onSelect: (id: string | null) => void;
  onUseItem: (itemId: string) => void;
  busy: boolean;
};

export function AdventureInventory({
  state,
  inventory,
  selectedItem,
  onSelect,
  onUseItem,
  busy,
}: Props) {
  const { locale } = useLocale();
  const t = useDict().games.bibleAdventure;

  if (inventory.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white/80 p-3">
        <p className="text-xs uppercase tracking-wider text-stone-500 mb-1">{t.inventory}</p>
        <p className="text-sm text-stone-400 italic">{t.inventoryEmpty}</p>
      </div>
    );
  }

  const selected = selectedItem ? getItem(selectedItem) : null;
  const canUseSelected = selectedItem ? canUseItem(state, selectedItem) : false;

  return (
    <div className="rounded-xl border border-stone-200 bg-white/80 p-3">
      <p className="text-xs uppercase tracking-wider text-stone-500 mb-2">{t.inventory}</p>
      <ul className="flex flex-wrap gap-2">
        {inventory.map((id) => {
          const item = getItem(id);
          if (!item) return null;
          const active = selectedItem === id;
          const usable = Boolean(ITEM_USE_EFFECTS[id]);
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(active ? null : id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  active
                    ? "border-olive-500 bg-olive-50 text-olive-900"
                    : "border-stone-200 bg-stone-50 text-stone-800 hover:border-olive-300"
                }`}
                title={itemDesc(item, locale)}
              >
                <span aria-hidden>{item.emoji}</span>
                <span>{itemName(item, locale)}</span>
                {usable && (
                  <span className="text-[10px] text-olive-600 uppercase">{t.usable}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {selected && (
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
          <p className="text-xs text-stone-600 leading-relaxed flex-1">
            {itemDesc(selected, locale)}
          </p>
          {ITEM_USE_EFFECTS[selectedItem!] && (
            <button
              type="button"
              disabled={!canUseSelected || busy}
              onClick={() => onUseItem(selectedItem!)}
              className="shrink-0 px-4 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold hover:bg-amber-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.useItem}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
