import assert from "node:assert/strict";
import { systemPromptForMode } from "../../lib/bible/rag-prompts";

const profSv = systemPromptForMode("professor", "sv");
assert.ok(profSv.includes("bibelprofessor"));
assert.ok(profSv.includes("ALDRIG"));
assert.ok(profSv.includes("Exeges"));

const guideEn = systemPromptForMode("guide", "en");
assert.ok(guideEn.includes("Bible guide"));
assert.ok(guideEn.includes("NEVER invent"));

console.log("rag-prompts.test.ts: ok");
