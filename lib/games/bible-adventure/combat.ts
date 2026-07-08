import type { RollResult } from "./character";
import type { EnemyDef } from "./enemies";

/** Fiende-HP baserat på hotnivå (1–4). */
export function enemyMaxHp(threat: number): number {
  return 10 + Math.max(1, Math.min(4, threat)) * 6;
}

/** Skada till fiende vid lyckat slag under möte. */
export function damageToEnemy(roll: RollResult): number {
  let dmg = Math.max(3, roll.total - roll.dc + 4);
  if (roll.critical === "nat20") dmg += 6;
  return Math.min(18, dmg);
}

/** Motattack när spelaren misslyckas under möte. */
export function enemyCounterDamage(roll: RollResult): number {
  let dmg = Math.max(2, Math.ceil((roll.dc - roll.total) / 2) + 2);
  if (roll.critical === "nat1") dmg += 4;
  return Math.min(12, dmg);
}

export function initEnemyHealth(enemy: EnemyDef): { health: number; maxHealth: number } {
  const maxHealth = enemyMaxHp(enemy.threat);
  return { health: maxHealth, maxHealth };
}

export const DEFEAT_FAITH_BONUS = 8;
export const DEFEAT_XP_BONUS = 20;
