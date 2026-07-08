import assert from "node:assert/strict";
import {
  clampHealth,
  damageFromFailedCheck,
  healthLabel,
  maxHealthFor,
  restHealAmount,
} from "../../lib/games/bible-adventure/health";
import {
  applyHealthDelta,
  applyRest,
  appendRollToState,
  createInitialState,
  normalizeState,
} from "../../lib/games/bible-adventure/state";
import { ADVENTURE_SCENARIOS } from "../../lib/games/bible-adventure/scenarios";

assert.equal(maxHealthFor("guardian", 1), 30);
assert.equal(maxHealthFor("prophet", 3), 32);
assert.equal(clampHealth(50, 30), 30);
assert.equal(clampHealth(-2, 30), 0);

assert.equal(damageFromFailedCheck(8, 12), 2);
assert.equal(damageFromFailedCheck(5, 15), 5);

assert.equal(healthLabel(25, 30, "sv"), "Frisk");
assert.equal(healthLabel(5, 30, "en"), "Critical");

const scenario = ADVENTURE_SCENARIOS[0]!;
const state = createInitialState(scenario, "sv", "guardian");
assert.equal(state.health, state.maxHealth);
assert.equal(state.restsUsed, 0);

const damaged = applyHealthDelta(state, -10);
assert.equal(damaged.health, state.maxHealth - 10);

const rested = applyRest({ ...state, health: 10 });
assert.ok(rested);
assert.ok(rested!.health > 10);
assert.equal(rested!.restsUsed, 1);

const failedRoll = appendRollToState(state, {
  virtue: "courage",
  d20: 3,
  modifier: 1,
  total: 4,
  dc: 12,
  success: false,
  inspiration: false,
  critical: null,
});
assert.ok(failedRoll.health < state.health);

const legacy = normalizeState({
  ...state,
  health: undefined,
  maxHealth: undefined,
  restsUsed: undefined,
} as unknown as Parameters<typeof normalizeState>[0]);
assert.ok(legacy.health > 0);
assert.ok(legacy.maxHealth >= legacy.health);

console.log("health.test.ts: ok");
