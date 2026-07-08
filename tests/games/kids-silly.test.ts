import assert from "node:assert/strict";
import {
  buildKidsSillyRound,
  KIDS_SILLY_STATEMENTS,
  statementText,
} from "../../lib/games/kids-silly";

let seed = 55;
function rng(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

assert.ok(KIDS_SILLY_STATEMENTS.length >= 8);
assert.equal(
  KIDS_SILLY_STATEMENTS.filter((s) => s.isTrue).length,
  KIDS_SILLY_STATEMENTS.filter((s) => !s.isTrue).length
);

const round = buildKidsSillyRound(8, rng);
assert.equal(round.length, 8);
const trueCount = round.filter((s) => s.isTrue).length;
const sillyCount = round.filter((s) => !s.isTrue).length;
assert.equal(trueCount, 4);
assert.equal(sillyCount, 4);

assert.ok(statementText(round[0], "sv").length > 0);
assert.ok(statementText(round[0], "en").length > 0);

console.log("kids-silly.test.ts: ok");
