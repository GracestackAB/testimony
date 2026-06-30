import assert from "node:assert/strict";
import { normalizeForDate, isIsoDateKey } from "../../lib/bible/dates";
import { adminBibleTextHref } from "../../lib/bible/admin-href";

// Normalfall
assert.equal(normalizeForDate("2026-06-28"), "2026-06-28");
assert.equal(normalizeForDate("2026-06-28T00:00:00.000Z"), "2026-06-28");

// Date-objekt (PG via Supabase)
assert.equal(normalizeForDate(new Date("2026-06-28T00:00:00.000Z")), "2026-06-28");

// Edge: får aldrig bli "Sun Jun 28"
const bad = new Date("2026-06-28T12:00:00");
assert.notEqual(normalizeForDate(bad).includes("Sun"), true);

// Failure: ogiltigt värde
assert.equal(normalizeForDate(null), "");

// isIsoDateKey
assert.equal(isIsoDateKey("2026-06-28"), true);
assert.equal(isIsoDateKey("Sun Jun 28"), false);

// Admin-href föredrar datum
assert.equal(
  adminBibleTextHref({ id: "uuid", for_date: new Date("2026-06-28T00:00:00.000Z") }),
  "/admin/bibeltexter/2026-06-28"
);

console.log("dates.test.ts: ok");
