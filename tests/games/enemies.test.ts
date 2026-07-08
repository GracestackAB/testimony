import assert from "node:assert/strict";
import {
  enemiesForScenario,
  enemyName,
  ENEMIES,
  isEnemyId,
  sanitizeEncounterId,
} from "../../lib/games/bible-adventure/enemies";
import { applyTurnResult, createInitialState } from "../../lib/games/bible-adventure/state";
import { ADVENTURE_SCENARIOS } from "../../lib/games/bible-adventure/scenarios";
import { parseAdventureTurn } from "../../lib/games/bible-adventure/engine";
import fs from "node:fs";
import path from "node:path";

assert.equal(ENEMIES.length, 9);
assert.ok(isEnemyId("haman"));
assert.equal(isEnemyId("dragon"), false);

const elijahEnemies = enemiesForScenario("elijah_carmel");
assert.equal(elijahEnemies.length, 2);
assert.ok(elijahEnemies.some((e) => e.id === "baal_priests"));

assert.equal(sanitizeEncounterId("haman", "esther_palace"), "haman");
assert.equal(sanitizeEncounterId("haman", "elijah_carmel"), null);

const scenario = ADVENTURE_SCENARIOS[1]!;
const state = createInitialState(scenario, "sv", "guardian");
const turn = parseAdventureTurn(
  JSON.stringify({
    narrative: "Haman stirrar på dig.",
    location: "Palatset",
    choices: [
      { id: "stand", label: "Stå kvar med värdighet" },
      { id: "pray", label: "Be i tysthet" },
    ],
    itemsGained: [],
    itemsLost: [],
    faithDelta: -2,
    healthDelta: 0,
    ended: false,
    encounterId: "haman",
  }),
  "sv",
  state
);
const next = applyTurnResult(state, turn);
assert.equal(next.activeEncounter, "haman");
assert.ok(next.encounteredEnemies.includes("haman"));
assert.ok(next.chronicle.some((e) => e.kind === "encounter" && e.action === "appear"));

assert.equal(enemyName(elijahEnemies[0]!, "sv"), "Baals präster");

for (const enemy of ENEMIES) {
  const file = path.join(process.cwd(), "public", enemy.imagePath);
  assert.ok(fs.existsSync(file), `missing image ${enemy.imagePath}`);
}

console.log("enemies.test.ts: ok");
