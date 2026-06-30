/**
 * Validerar att alla referenser i läsplanen kan parsas för API.Bible.
 * Kör: npx tsx scripts/validate-bible-references.ts
 */
import plan from "../data/bible-reading-plan.json";
import { parseSwedishReference } from "../lib/bible/reference";

const entries = plan as { reference: string }[];
const failed: string[] = [];

for (const entry of entries) {
  try {
    parseSwedishReference(entry.reference);
  } catch {
    failed.push(entry.reference);
  }
}

if (failed.length > 0) {
  console.error(`❌ ${failed.length} referenser kunde inte parsas:`);
  for (const ref of failed) console.error("  -", ref);
  process.exit(1);
}

console.log(`✓ Alla ${entries.length} referenser i läsplanen parsas korrekt.`);
