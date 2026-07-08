import assert from "node:assert/strict";
import {
  buildKidsOrderRound,
  buildStoryRound,
  isCorrectOrder,
  KIDS_STORIES,
} from "../../lib/games/kids-order";

let seed = 17;
function rng(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

assert.ok(KIDS_STORIES.length >= 4);
for (const story of KIDS_STORIES) {
  assert.equal(story.steps.length, 3);
  assert.deepEqual(
    story.steps.map((s) => s.order).sort(),
    [1, 2, 3]
  );
}

const round = buildStoryRound(KIDS_STORIES[0], rng);
assert.equal(round.shuffledSteps.length, 3);
assert.equal(isCorrectOrder(round.shuffledSteps.sort((a, b) => a.order - b.order)), true);

const wrong = [...round.shuffledSteps].reverse();
assert.equal(isCorrectOrder(wrong), false);

const full = buildKidsOrderRound(4, rng);
assert.equal(full.length, 4);
assert.equal(new Set(full.map((r) => r.story.id)).size, 4);

console.log("kids-order.test.ts: ok");
