import assert from "node:assert/strict";
import { parseStoryTurn } from "../../lib/games/story-adventure";
import { getScenario, isStoryScenarioId } from "../../lib/games/story-scenarios";

// parseStoryTurn — expected JSON
const good = parseStoryTurn(
  JSON.stringify({
    narrative: "Du går vidare på stigen.",
    choices: ["Be en bön", "Hjälp den skadade"],
    scriptureNote: "Lukas 10:33",
    ended: false,
    reflection: null,
  }),
  "sv"
);
assert.equal(good.narrative.includes("stigen"), true);
assert.equal(good.choices.length, 2);
assert.equal(good.ended, false);

// parseStoryTurn — ended
const end = parseStoryTurn(
  `{"narrative":"Berättelsen slutar.","choices":[],"ended":true,"reflection":"Vem var din nästa?"}`,
  "sv"
);
assert.equal(end.ended, true);
assert.equal(end.choices.length, 0);
assert.ok(end.reflection);

// parseStoryTurn — edge: invalid JSON
const bad = parseStoryTurn("not json at all", "en");
assert.ok(bad.narrative.length > 10);
assert.ok(bad.choices.length >= 2);

// parseStoryTurn — failure: too few choices
const few = parseStoryTurn('{"narrative":"x","choices":["only one"],"ended":false}', "en");
assert.ok(few.choices.length >= 2);

// scenarios
assert.equal(isStoryScenarioId("good_samaritan"), true);
assert.equal(isStoryScenarioId("invalid"), false);
assert.ok(getScenario("with_paul")?.title.en.includes("Paul"));

console.log("story-adventure.test.ts: ok");
