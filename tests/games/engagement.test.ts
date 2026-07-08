import assert from "node:assert/strict";
import { atmosphereLine } from "../../lib/games/bible-adventure/atmosphere";
import {
  damageToEnemy,
  enemyMaxHp,
  initEnemyHealth,
} from "../../lib/games/bible-adventure/combat";
import { getEnemy } from "../../lib/games/bible-adventure/enemies";
import { appendRollToState, createInitialState } from "../../lib/games/bible-adventure/state";
import { ADVENTURE_SCENARIOS } from "../../lib/games/bible-adventure/scenarios";
import { clampTension, DEFAULT_TENSION, tensionLabel } from "../../lib/games/bible-adventure/tension";

assert.equal(DEFAULT_TENSION, 35);
assert.equal(clampTension(150), 100);
assert.equal(tensionLabel(85, "sv"), "Ödesögonblick");

const haman = getEnemy("haman")!;
assert.equal(enemyMaxHp(haman.threat), 34);
const init = initEnemyHealth(haman);
assert.equal(init.health, init.maxHealth);

const scenario = ADVENTURE_SCENARIOS[1]!;
const state = createInitialState(scenario, "sv", "guardian");
assert.equal(state.tension, DEFAULT_TENSION);

const withEnemy = {
  ...state,
  activeEncounter: "haman" as const,
  enemyHealth: 20,
  enemyMaxHealth: 34,
  tension: 50,
};

const roll = {
  virtue: "courage" as const,
  d20: 18,
  modifier: 2,
  total: 20,
  dc: 12,
  success: true,
  inspiration: false,
  critical: null as const,
};
assert.ok(damageToEnemy(roll) >= 3);

const after = appendRollToState(withEnemy, roll);
assert.ok(after.enemyHealth !== null && after.enemyHealth < 20);

const atmo = atmosphereLine("elijah_carmel", 0, "sv");
assert.ok(atmo.length > 10);

console.log("engagement.test.ts: ok");
