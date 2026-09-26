import assert from "node:assert/strict";
import {
  ARCHETYPES,
  createVirtues,
  levelFromXp,
  resolveSkillCheck,
  rollD20,
  sanitizeSkillCheck,
  virtueModifier,
  XP_LEVEL_2,
  XP_LEVEL_3,
} from "../../lib/games/bible-adventure/character";
import { appendRollToState, createInitialState } from "../../lib/games/bible-adventure/state";
import { ADVENTURE_SCENARIOS } from "../../lib/games/bible-adventure/scenarios";

assert.equal(ARCHETYPES.length, 4);

const prophetVirtues = createVirtues("prophet");
assert.equal(prophetVirtues.wisdom, 12);
assert.equal(prophetVirtues.courage, 10);

assert.equal(virtueModifier(10), 0);
assert.equal(virtueModifier(14), 2);
assert.equal(virtueModifier(8), -1);

const d20 = rollD20();
assert.ok(d20 >= 1 && d20 <= 20);

const check = sanitizeSkillCheck({ virtue: "courage", dc: 20 });
assert.ok(check);
assert.equal(check!.dc, 18);
assert.equal(sanitizeSkillCheck({ virtue: "invalid", dc: 10 }), null);

const roll = resolveSkillCheck({
  virtues: createVirtues("guardian"),
  check: { virtue: "courage", dc: 10 },
  useInspiration: false,
  archetypeId: "guardian",
});
assert.equal(roll.virtue, "courage");
assert.ok(roll.total >= roll.d20 + roll.modifier - 1);

const inspired = resolveSkillCheck({
  virtues: createVirtues("prophet"),
  check: { virtue: "wisdom", dc: 12 },
  useInspiration: true,
  archetypeId: "prophet",
});
assert.equal(inspired.inspiration, true);
assert.ok(inspired.d20Second !== undefined);

assert.equal(levelFromXp(0), 1);
assert.equal(levelFromXp(XP_LEVEL_2), 2);
assert.equal(levelFromXp(XP_LEVEL_3), 3);

const scenario = ADVENTURE_SCENARIOS[0]!;
const state = createInitialState(scenario, "sv", "pilgrim");
assert.equal(state.archetypeId, "pilgrim");
assert.equal(state.level, 1);

const afterRoll = appendRollToState(state, {
  virtue: "steadfastness",
  d20: 15,
  modifier: 1,
  total: 16,
  dc: 12,
  success: true,
  inspiration: false,
  critical: null,
});
assert.ok(afterRoll.xp > state.xp);
assert.ok(afterRoll.chronicle.some((e) => e.kind === "roll"));

console.log("character.test.ts: ok");
