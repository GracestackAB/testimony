import assert from "node:assert/strict";
import { buildYouthDuel, isYouthDuelCorrect, YOUTH_DUEL_QUESTIONS } from "../../lib/games/youth-duel";
import { DUEL_TOTAL_QUESTIONS } from "../../lib/games/youth-duel-social";

assert.ok(YOUTH_DUEL_QUESTIONS.length >= DUEL_TOTAL_QUESTIONS);

const round = buildYouthDuel(DUEL_TOTAL_QUESTIONS);
assert.equal(round.length, DUEL_TOTAL_QUESTIONS);

for (const q of round) {
  assert.ok(q.optionsSv.length === 4);
  assert.ok(isYouthDuelCorrect(q, q.correctIndex));
  assert.equal(isYouthDuelCorrect(q, (q.correctIndex + 1) % 4), false);
}

console.log("youth-duel.test.ts: ok");
