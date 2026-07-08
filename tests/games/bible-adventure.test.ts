import assert from "node:assert/strict";
import { parseAdventureTurn } from "../../lib/games/bible-adventure/engine";
import { computeEndingRank, buildChronicleExport } from "../../lib/games/bible-adventure/endings";
import { canUseItem } from "../../lib/games/bible-adventure/item-effects";
import { isAdventureScenarioId, ADVENTURE_SCENARIOS } from "../../lib/games/bible-adventure/scenarios";
import {
  applyFreePrayer,
  applyItemUse,
  applyPlayerChoice,
  applyTurnResult,
  canPrayFree,
  clampFaith,
  createInitialState,
  findChoice,
  hasRequiredItem,
  normalizeState,
} from "../../lib/games/bible-adventure/state";

assert.equal(ADVENTURE_SCENARIOS.length, 4);

for (const id of ["elijah_carmel", "esther_palace", "joseph_pit", "cleopas_road"]) {
  assert.ok(isAdventureScenarioId(id));
}
assert.equal(isAdventureScenarioId("good_samaritan"), false);

const scenario = ADVENTURE_SCENARIOS[0]!;
const state = createInitialState(scenario, "sv", "prophet");
assert.equal(state.faith, 50);
assert.equal(state.turn, 0);
assert.ok(state.inventory.includes("scripture_scroll"));
assert.ok(state.choices.length >= 2);
assert.deepEqual(state.locations, [scenario.startLocation.sv]);

const scrollChoice = state.choices.find((c) => c.id === "read_scroll");
assert.ok(scrollChoice);
assert.ok(hasRequiredItem(state.inventory, scrollChoice!));

const afterChoice = applyPlayerChoice(state, state.choices[0]!);
assert.equal(afterChoice.choices.length, 0);
assert.ok(afterChoice.chronicle.some((e) => e.kind === "choice"));

assert.equal(state.archetypeId, "prophet");
assert.equal(state.level, 1);
assert.ok(state.virtues.wisdom >= 12);
assert.equal(state.health, state.maxHealth);

const turn = parseAdventureTurn(
  JSON.stringify({
    narrative: "Elden föll från himlen.",
    location: "Karmels topp",
    choices: [
      { id: "praise", label: "Prisa Herren", tone: "faith", skillCheck: { virtue: "courage", dc: 10 } },
      { id: "flee", label: "Fly till öknen", tone: "courage" },
    ],
    itemsGained: ["harp"],
    itemsLost: [],
    faithDelta: 8,
    scriptureNote: "1 Kung 18:38",
    ended: false,
    reflection: null,
    milestoneId: "courage_shown",
  }),
  "sv",
  afterChoice
);

const next = applyTurnResult(afterChoice, turn);
assert.equal(next.faith, 58);
assert.equal(next.turn, 1);
assert.ok(next.inventory.includes("harp"));
assert.equal(next.location, "Karmels topp");
assert.equal(next.choices.length, 2);
assert.ok(next.choices[0]?.skillCheck?.virtue === "courage");
assert.ok(next.milestones.includes("courage_shown"));
assert.ok(next.scriptures.includes("1 Kung 18:38"));

assert.equal(clampFaith(150), 100);
assert.equal(clampFaith(-5), 0);

const lowFaith = { ...next, faith: 20, prayedFree: false };
assert.ok(canPrayFree(lowFaith));
const prayed = applyFreePrayer(lowFaith);
assert.equal(prayed.faith, 28);
assert.ok(prayed.prayedFree);
assert.ok(prayed.milestones.includes("prayerful_heart"));

assert.ok(canUseItem(next, "waterskin"));
const used = applyItemUse(next, "waterskin");
assert.ok(used);
assert.ok(!used!.inventory.includes("waterskin"));
assert.equal(used!.itemUseTurn, next.turn);

const rank = computeEndingRank({ ...next, faith: 80 });
assert.equal(rank.id, "faithful_witness");

const exported = buildChronicleExport(prayed, "sv");
assert.ok(exported.includes("Bibel-krönika"));

const legacy = normalizeState({
  ...state,
  scriptures: undefined,
  locations: undefined,
  milestones: undefined,
} as unknown as Parameters<typeof normalizeState>[0]);
assert.ok(Array.isArray(legacy.scriptures));
assert.ok(legacy.itemUseTurn === -1);

const choice = findChoice(next, "praise");
assert.ok(choice);

console.log("bible-adventure.test.ts: ok");
