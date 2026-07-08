import { getItem } from "./items";
import type { EnemyId } from "./enemies";

/** Möjliga byte när en fiende besegras (scenario-tematiska). */
export const DEFEAT_LOOT: Partial<Record<EnemyId, string[]>> = {
  baal_priests: ["oil_lamp", "bread"],
  king_ahab: ["seal_ring", "scripture_scroll"],
  haman: ["seal_ring", "myrrh"],
  palace_guard: ["bread", "waterskin"],
  slave_traders: ["waterskin", "travel_cloak"],
  potiphar: ["seal_ring", "staff"],
  prison_warden: ["bread", "oil_lamp"],
  road_bandits: ["bread", "waterskin"],
  roman_patrol: ["travel_cloak", "bread"],
};

export const DEFEAT_LOOT_CHANCE = 0.55;

/**
 * Välj byte efter seger. `roll` ska vara 0–1 (deterministiskt i tester).
 */
export function pickDefeatLoot(
  enemyId: EnemyId,
  inventory: string[],
  roll: number
): string | null {
  if (roll > DEFEAT_LOOT_CHANCE) return null;
  const pool = DEFEAT_LOOT[enemyId];
  if (!pool?.length) return null;
  const owned = new Set(inventory);
  const candidates = pool.filter((id) => !owned.has(id) && getItem(id));
  if (candidates.length === 0) return null;
  const idx = Math.floor(roll * candidates.length * 10) % candidates.length;
  return candidates[idx] ?? candidates[0]!;
}
