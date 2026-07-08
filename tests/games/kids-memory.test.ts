import assert from "node:assert/strict";
import {
  buildKidsMemoryBoard,
  isKidsMemoryComplete,
  kidsMemoryCardsMatch,
  KIDS_MEMORY_PAIRS,
} from "../../lib/games/kids-memory";

let seed = 99;
function rng(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

assert.ok(KIDS_MEMORY_PAIRS.length >= 5);

const board = buildKidsMemoryBoard(5, "sv", rng);
assert.equal(board.cards.length, 10);
assert.equal(board.pairCount, 5);
assert.equal(board.pairs.length, 5);

const person = board.cards.find((c) => c.kind === "person")!;
const story = board.cards.find((c) => c.pairId === person.pairId && c.kind === "story")!;
assert.equal(kidsMemoryCardsMatch(person, story), true);
assert.equal(kidsMemoryCardsMatch(person, person), false);

const matched = new Set([person.pairId]);
assert.equal(isKidsMemoryComplete(matched, 5), false);
assert.equal(
  isKidsMemoryComplete(new Set(board.pairs.map((p) => p.id)), 5),
  true
);

console.log("kids-memory.test.ts: ok");
