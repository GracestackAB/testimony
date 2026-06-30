#!/usr/bin/env node
/**
 * Genererar 365-dagars läsplan (cyklar genom nyckelreferenser).
 * Kör: node scripts/generate-bible-reading-plan.mjs > data/bible-reading-plan.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, "../data/bible-reading-plan-seed.json");
const outPath = path.join(__dirname, "../data/bible-reading-plan.json");

const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const plan = [];

for (let day = 0; day < 365; day++) {
  const entry = seed[day % seed.length];
  plan.push({ reference: entry.reference, theme: entry.theme });
}

fs.writeFileSync(outPath, JSON.stringify(plan, null, 2) + "\n");
console.log(`Skrev ${plan.length} dagar → ${outPath}`);
