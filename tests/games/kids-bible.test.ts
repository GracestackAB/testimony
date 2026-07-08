import assert from "node:assert/strict";
import {
  buildKidsRound,
  correctOptionIndex,
  KIDS_BIBLE_QUESTIONS,
  optionLabel,
  questionText,
  shuffle,
} from "../../lib/games/kids-bible";

let seed = 42;
function rng(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

assert.ok(KIDS_BIBLE_QUESTIONS.length >= 8);
for (const q of KIDS_BIBLE_QUESTIONS) {
  assert.equal(q.options.length, 3);
  assert.equal(q.options.filter((o) => o.correct).length, 1);
}

const round = buildKidsRound(8, rng);
assert.equal(round.length, 8);
assert.equal(new Set(round.map((q) => q.id)).size, 8);

for (const q of round) {
  assert.equal(q.shuffledOptions.length, 3);
  assert.equal(correctOptionIndex(q.shuffledOptions), q.shuffledOptions.findIndex((o) => o.correct));
}

const shuffled = shuffle([1, 2, 3, 4, 5], rng);
assert.deepEqual(new Set(shuffled), new Set([1, 2, 3, 4, 5]));

const first = KIDS_BIBLE_QUESTIONS[0];
assert.ok(questionText(first, "sv").length > 0);
assert.ok(questionText(first, "en").length > 0);
assert.ok(optionLabel(first.options[0], "sv").length > 0);

console.log("kids-bible.test.ts: ok");
