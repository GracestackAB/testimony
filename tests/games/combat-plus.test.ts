import assert from "node:assert/strict";
import { applyAllyDcToCheck, allyDcReduction } from "../../lib/games/bible-adventure/ally-bonuses";
import { pickDefeatLoot, DEFEAT_LOOT_CHANCE } from "../../lib/games/bible-adventure/loot";
import { applyFlee, applyTurnResult, canFlee, createInitialState } from "../../lib/games/bible-adventure/state";
import { computeAdventureStats } from "../../lib/games/bible-adventure/stats";
import { ADVENTURE_SCENARIOS } from "../../lib/games/bible-adventure/scenarios";

assert.equal(allyDcReduction("obadiah", "wisdom"), 2);
assert.equal(allyDcReduction("obadiah", "courage"), 0);
assert.equal(applyAllyDcToCheck("mordecai", { virtue: "compassion", dc: 14 }).dc, 12);

const loot = pickDefeatLoot("haman", [], 0.1);
assert.ok(loot === "seal_ring" || loot === "myrrh");
assert.equal(pickDefeatLoot("haman", [], 0.99), null);
assert.equal(DEFEAT_LOOT_CHANCE > 0, true);

const scenario = ADVENTURE_SCENARIOS[0]!;
const withEnemy = {
  ...createInitialState(scenario, "sv", "guardian"),
  activeEncounter: "baal_priests" as const,
  enemyHealth: 10,
  enemyMaxHealth: 28,
};
assert.ok(canFlee(withEnemy));
const fled = applyFlee(withEnemy)!;
assert.equal(fled.activeEncounter, null);
assert.ok(fled.chronicle.some((e) => e.kind === "flee"));

const state = createInitialState(scenario, "sv", "servant");
const damaged = { ...state, health: 15 };
const withAlly = applyTurnResult(damaged, {
  narrative: "Änkan delar sitt bröd.",
  location: damaged.location,
  choices: damaged.choices,
  itemsGained: [],
  itemsLost: [],
  faithDelta: 0,
  ended: false,
  reflection: null,
  scriptureNote: null,
  allyId: "widow_zarephath",
});
assert.equal(withAlly.faith, damaged.faith + 3);
assert.ok(withAlly.health > damaged.health);

const stats = computeAdventureStats({
  ...withAlly,
  defeatedEnemies: ["baal_priests"],
});
assert.equal(stats.alliesMet, 1);
assert.equal(stats.enemiesDefeated, 1);

console.log("combat-plus.test.ts: ok");
