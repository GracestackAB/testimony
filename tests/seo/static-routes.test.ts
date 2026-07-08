import assert from "node:assert/strict";
import { STATIC_SITEMAP_ROUTES } from "../../lib/seo/static-routes";

assert.ok(STATIC_SITEMAP_ROUTES.some((r) => r.path === "/bibel-ai"));
assert.ok(STATIC_SITEMAP_ROUTES.some((r) => r.path === "/spel/verspussel"));
assert.ok(STATIC_SITEMAP_ROUTES.some((r) => r.path === "/spel/minnespar"));
assert.ok(STATIC_SITEMAP_ROUTES.some((r) => r.path === "/spel/barn-sant"));
assert.ok(STATIC_SITEMAP_ROUTES.some((r) => r.path === "/spel/bibel-duell"));
assert.ok(STATIC_SITEMAP_ROUTES.some((r) => r.path === "/spel/bibel-aventyr"));
assert.equal(STATIC_SITEMAP_ROUTES.filter((r) => r.path.startsWith("/spel")).length, 12);

console.log("seo-static-routes.test.ts: ok");
