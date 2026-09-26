import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { canonicalUrl } from "../../lib/seo/canonical";
import { middleware } from "../../middleware";

const site = "https://www.testimony.se";

async function main() {
  for (const path of ["/", "/stod", "/spel/barn", "/vittnesbord/joni-kicil"]) {
    assert.equal(canonicalUrl(site, path), `${site}${path}`);
  }
  assert.equal(canonicalUrl(site, null), `${site}/`);
  assert.equal(canonicalUrl(site, "/stod?session_id=private#thanks"), `${site}/stod`);
  assert.equal(canonicalUrl(site, "https://example.org/"), `${site}/`);
  assert.equal(new URL(canonicalUrl(site, "//example.org/path")).origin, site);

  for (const [alias, target] of [
    ["/support", "/stod"],
    ["/testimonies", "/vittnesbord"],
    ["/games", "/spel"],
    ["/cell-groups", "/cellgrupper"],
    ["/cell-groups/new", "/cellgrupper/nya"],
    ["/forum", "/forum"],
  ]) {
    const response = await middleware(new NextRequest(`${site}${alias}?ref=seo`, {
      headers: { host: "www.testimony.se", "x-pathname": "/wrong-page" },
    }));
    assert.equal(response.headers.get("x-middleware-request-x-pathname"), target);
    assert.equal(response.headers.get("x-middleware-rewrite"), `${site}${target}?ref=seo`);
  }

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anonymous-key";
  const response = await middleware(new NextRequest(`${site}/stod?ref=seo`, {
    headers: { host: "www.testimony.se", "x-pathname": "/wrong-page" },
  }));
  assert.equal(response.headers.get("x-middleware-request-x-pathname"), "/stod");
  assert.equal(response.headers.get("x-middleware-next"), "1");
  console.log("seo-canonical.test.ts: ok");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
