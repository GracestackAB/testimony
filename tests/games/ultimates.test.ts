import assert from "node:assert/strict";
import {
  canUseUltimate,
  MERCY_STRIKE_BONUS,
  PILGRIM_HEAL_RATIO,
} from "../../lib/games/bible-adventure/ultimates";
import { appendRollToState, applyUltimate, createInitialState } from "../../lib/games/bible-adventure/state";
import { ADVENTURE_SCENARIOS } from "../../lib/games/bible-adventure/scenarios";

const scenario = ADVENTURE_SCENARIOS[0]!;

const pilgrim = { ...createInitialState(scenario, "sv", "pilgrim"), health: 20 };
assert.ok(canUseUltimate(pilgrim));
const healed = applyUltimate(pilgrim)!;
assert.ok(healed.ultimateUsed);
assert.ok(!canUseUltimate(healed));
const expectedHeal = Math.min(
  Math.round(pilgrim.maxHealth * PILGRIM_HEAL_RATIO),
  pilgrim.maxHealth - pilgrim.health
);
assert.equal(healed.health - pilgrim.health, expectedHeal);

const prophet = createInitialState(scenario, "sv", "prophet");
const wisdomBuff = applyUltimate(prophet)!;
assert.equal(wisdomBuff.ultimateBuff, "wisdom_auto");
const failRoll = {
  virtue: "wisdom" as const,
  d20: 3,
  modifier: 0,
  total: 3,
  dc: 14,
  success: false,
  inspiration: false,
  critical: null as const,
};
const afterWisdom = appendRollToState(wisdomBuff, failRoll);
assert.equal(afterWisdom.ultimateBuff, null);
const rollEntry = afterWisdom.chronicle.find((e) => e.kind === "roll");
assert.ok(rollEntry && rollEntry.kind === "roll" && rollEntry.success);

const guardian = createInitialState(scenario, "sv", "guardian");
const shielded = applyUltimate(guardian)!;
assert.equal(shielded.ultimateBuff, "damage_shield");
const shieldRoll = {
  virtue: "courage" as const,
  d20: 2,
  modifier: 0,
  total: 2,
  dc: 12,
  success: false,
  inspiration: false,
  critical: null as const,
};
const afterShield = appendRollToState(shielded, shieldRoll);
assert.equal(afterShield.health, guardian.health);
assert.ok(afterShield.chronicle.some((e) => e.kind === "ultimate"));

const servant = createInitialState(scenario, "sv", "servant");
const mercy = applyUltimate(servant)!;
assert.equal(mercy.faith, servant.faith + 15);
assert.equal(mercy.ultimateBuff, "mercy_strike");

const withEnemy = {
  ...mercy,
  activeEncounter: "ahab" as const,
  enemyHealth: 30,
  enemyMaxHealth: 30,
};
const hitRoll = {
  virtue: "courage" as const,
  d20: 15,
  modifier: 2,
  total: 17,
  dc: 12,
  success: true,
  inspiration: false,
  critical: null as const,
};
const afterMercy = appendRollToState(withEnemy, hitRoll);
const hit = afterMercy.chronicle.find((e) => e.kind === "enemy_hit");
assert.ok(hit && hit.kind === "enemy_hit");
assert.ok(hit.damage >= 3 + MERCY_STRIKE_BONUS);
assert.equal(afterMercy.ultimateBuff, null);

console.log("ultimates.test.ts: ok");
