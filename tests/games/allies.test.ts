import assert from "node:assert/strict";
import { sanitizeAllyId, alliesForScenario } from "../../lib/games/bible-adventure/allies";
import { applyTurnResult, createInitialState } from "../../lib/games/bible-adventure/state";
import { ADVENTURE_SCENARIOS } from "../../lib/games/bible-adventure/scenarios";

const scenario = ADVENTURE_SCENARIOS[0]!;
const elijahAllies = alliesForScenario("elijah_carmel");
assert.equal(elijahAllies.length, 2);
assert.ok(elijahAllies.some((a) => a.id === "obadiah"));

assert.equal(sanitizeAllyId("obadiah", "elijah_carmel"), "obadiah");
assert.equal(sanitizeAllyId("mordecai", "elijah_carmel"), null);
assert.equal(sanitizeAllyId("nope", "elijah_carmel"), null);

const state = createInitialState(scenario, "sv", "pilgrim");
assert.equal(state.activeAlly, null);
assert.deepEqual(state.metAllies, []);

const withAlly = applyTurnResult(state, {
  narrative: "Obadja viskar från skuggan.",
  location: state.location,
  choices: state.choices,
  itemsGained: [],
  itemsLost: [],
  faithDelta: 0,
  ended: false,
  reflection: null,
  scriptureNote: null,
  allyId: "obadiah",
});

assert.equal(withAlly.activeAlly, "obadiah");
assert.ok(withAlly.metAllies.includes("obadiah"));
assert.ok(withAlly.chronicle.some((e) => e.kind === "ally" && e.action === "appear"));

const departed = applyTurnResult(withAlly, {
  narrative: "Vägen skiljer er.",
  location: withAlly.location,
  choices: withAlly.choices,
  itemsGained: [],
  itemsLost: [],
  faithDelta: 0,
  ended: false,
  reflection: null,
  scriptureNote: null,
  allyId: null,
});

assert.equal(departed.activeAlly, null);
assert.ok(departed.chronicle.some((e) => e.kind === "ally" && e.action === "depart"));

console.log("allies.test.ts: ok");
