import assert from "node:assert/strict";
import {
  buildQuestion,
  buildQuiz,
  buildQuizWithSeed,
  getPassagePool,
  isCorrectAnswer,
  shuffle,
  truncateVerse,
  type BiblePassage,
} from "../../lib/games/bible-quiz";

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
  {
    reference: "Ps 23:1",
    book: "Psalmerna",
    testament: "ot",
    topic: "Herren min herde",
    content: "Herren är min herde, mig skall inget fattas.",
  },
  {
    reference: "Fil 4:13",
    book: "Filipperbrevet",
    testament: "nt",
    topic: "styrka",
    content: "Allt förmår jag i honom som ger mig kraft.",
  },
];

// Deterministic rng for reproducible tests
let seed = 0;
function rng(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

// shuffle
const shuffled = shuffle([1, 2, 3, 4, 5], () => 0.9);
assert.equal(shuffled.length, 5);
assert.deepEqual([...shuffled].sort(), [1, 2, 3, 4, 5]);

// truncateVerse — normal
assert.equal(truncateVerse("Kort vers."), "Kort vers.");

// truncateVerse — edge: long text
const long = "A".repeat(200);
const truncated = truncateVerse(long, 50);
assert.equal(truncated.endsWith("…"), true);
assert.ok(truncated.length <= 51);

// buildQuestion — expected use
seed = 42;
const q = buildQuestion(POOL[0], POOL, "reference", rng);
assert.equal(q.options.length, 4);
assert.equal(q.options[q.correctIndex], "Johannes 3:16");
assert.ok(q.prompt.includes("Gud så älskade"));

// buildQuiz — count capped
seed = 7;
const quiz = buildQuiz(2, "sv", rng);
assert.equal(quiz.length, 2);
assert.notEqual(quiz[0].passage.reference, quiz[1].passage.reference);

// English pool
const enPool = getPassagePool("en");
assert.ok(enPool.length >= 4);
assert.equal(enPool[0].reference.includes("John") || enPool[0].reference.includes("Romans"), true);

// isCorrectAnswer
assert.equal(isCorrectAnswer(q, q.correctIndex), true);
assert.equal(isCorrectAnswer(q, (q.correctIndex + 1) % 4), false);

// failure: too few passages — use tiny custom pool via buildQuestion only; buildQuiz needs full pool

const a = buildQuizWithSeed(5, "sv", "challenge-abc");
const b = buildQuizWithSeed(5, "sv", "challenge-abc");
assert.equal(a.length, 5);
assert.equal(a[0].id, b[0].id);
assert.equal(a[4].passage.reference, b[4].passage.reference);

const c = buildQuizWithSeed(5, "sv", "other-seed");
assert.notEqual(a[0].id, c[0].id);

console.log("bible-quiz.test.ts: ok");
