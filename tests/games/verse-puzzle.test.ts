import assert from "node:assert/strict";
import {
  buildVersePuzzle,
  buildVersePuzzleRound,
  checkPuzzleAnswers,
} from "../../lib/games/verse-puzzle";
import type { BiblePassage } from "../../lib/games/bible-quiz";

const POOL: BiblePassage[] = [
  {
    reference: "Johannes 3:16",
    book: "Johannes",
    testament: "nt",
    topic: "frälsning",
    content: "Gud så älskade världen att han utgav sin enfödde Son.",
  },
  {
    reference: "Rom 8:28",
    book: "Romerna",
    testament: "nt",
    topic: "Guds plan",
    content: "Vi vet att allt samverkar till gott för dem som älskar Gud.",
  },
];

let seed = 1;
function rng(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

const puzzle = buildVersePuzzle(POOL[0], POOL, "sv", rng);
assert.ok(puzzle.blanks.length >= 1);
assert.ok(puzzle.wordBank.includes(puzzle.blanks[0].word));
assert.ok(puzzle.segments.some((s) => s.type === "blank"));

const answers: Record<number, string> = {};
puzzle.blanks.forEach((b) => {
  answers[b.slotIndex] = b.word;
});
assert.equal(checkPuzzleAnswers(puzzle, answers), true);
assert.equal(checkPuzzleAnswers(puzzle, { 0: "fel" }), false);

const round = buildVersePuzzleRound(3, "sv", rng);
assert.equal(round.length, 3);

console.log("verse-puzzle.test.ts: ok");
