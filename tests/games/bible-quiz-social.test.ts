import assert from "node:assert/strict";
import {
  compareChallengeScores,
  medalForRank,
  rankLeaderboardRows,
} from "../../lib/games/bible-quiz-social";

assert.equal(compareChallengeScores(7, 9), "win");
assert.equal(compareChallengeScores(9, 7), "lose");
assert.equal(compareChallengeScores(8, 8), "draw");

const ranked = rankLeaderboardRows([
  { user_id: "a", best_score: 8, first_at: "2026-06-30T10:00:00Z" },
  { user_id: "b", best_score: 10, first_at: "2026-06-30T11:00:00Z" },
  { user_id: "c", best_score: 8, first_at: "2026-06-29T10:00:00Z" },
]);
assert.equal(ranked[0].rank, 1);
assert.equal(ranked[0].user_id, "b");
assert.equal(ranked[1].user_id, "c");
assert.equal(ranked[2].user_id, "a");

assert.equal(medalForRank(1), "🥇");
assert.equal(medalForRank(4), null);

console.log("bible-quiz-social.test.ts: ok");
