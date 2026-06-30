import assert from "node:assert/strict";
import { buildMemoryBoard, cardsMatch, isBoardComplete } from "../../lib/games/memory-pairs";

let seed = 7;
function rng(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

const board = buildMemoryBoard(4, "sv", rng);
assert.equal(board.cards.length, 8);
assert.equal(board.pairCount, 4);

const ref = board.cards.find((c) => c.kind === "reference")!;
const verse = board.cards.find((c) => c.pairId === ref.pairId && c.kind === "verse")!;
assert.equal(cardsMatch(ref, verse), true);
assert.equal(cardsMatch(ref, ref), false);

const matched = new Set([ref.pairId]);
assert.equal(isBoardComplete(matched, 4), false);
assert.equal(isBoardComplete(new Set(board.cards.map((c) => c.pairId)), 4), true);

console.log("memory-pairs.test.ts: ok");
