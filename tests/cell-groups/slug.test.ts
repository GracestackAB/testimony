import assert from "node:assert/strict";
import { cellGroupSlugFromName } from "../../lib/cell-group";

const slug1 = cellGroupSlugFromName("Loyalty Tropa för Gud");
assert.match(slug1, /^loyalty-tropa-for-gud-[A-Za-z0-9_-]+$/);

const slug2 = cellGroupSlugFromName("Loyalty Tropa för Gud");
assert.notEqual(slug1, slug2, "slugs should be unique per call");

const slugEmpty = cellGroupSlugFromName("!!!");
assert.match(slugEmpty, /^cellgrupp-[A-Za-z0-9_-]+$/);

console.log("cell-group-slug.test.ts: ok");
