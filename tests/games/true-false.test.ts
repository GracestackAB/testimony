import assert from "node:assert/strict";
import { buildTrueFalseRound } from "../../lib/games/true-false";

let seed = 42;
function rng(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

const round = buildTrueFalseRound(5, "sv", rng);
assert.equal(round.length, 5);
assert.ok(round.every((q) => q.statement.length > 5));
assert.ok(round.every((q) => q.explanation.includes("—") || q.explanation.includes("”")));

console.log("true-false.test.ts: ok");
