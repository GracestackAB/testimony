# Canonical URLs and support checkout — 2026-09-26

## Changes

The shared layout previously declared the home page as the canonical URL for every page. It now reads the route passed by middleware and generates a page-specific canonical, language alternate and Open Graph URL. Middleware overwrites the internal pathname header, including when rewriting an English alias to its Swedish route. Query strings and fragments are omitted. The Bible AI page also declares its Open Graph URL because its own metadata replaces the layout's Open Graph object.

All three support buttons returned HTTP 500 because their active Stripe prices referenced an inactive product. The existing live product `prod_UO3jYHudANa2pJ` ("Stöd testimony.se") was reactivated. The existing monthly prices remain 19.90, 99 and 199 SEK. No application change or replacement product was needed for checkout.

## Production source preservation

GitHub main at `7a9e60c` did not contain the cell-group changes already deployed in `ca-testimony-prod--cellgrupp-fix`. The 14 modified/untracked source files were recovered from `/home/kim/CascadeProjects/testimony` on `vm-gracestack-dev` and merged into this isolated working copy before building. No database migration was executed; migration 0021 was already deployed. Both old and new images contain the same 149 route entries.

This working copy is `/home/kim/CascadeProjects/testimony-se-repair-20260926`. Its Git diff includes the recovered existing cell-group code as well as this repair. The deployed repair and recovered cell-group source are included in the September 26 migration to `GracestackAB/testimony`. Do not redeploy the older `cedendahlkim/testimony` main branch without these changes.

Some existing game test fixtures no longer matched their TypeScript interfaces. Their nullable fields and one enemy ID were corrected to allow a full type check; all five affected test suites passed.

## Validation

- `npm run test:seo`: static routes, canonical URL construction, query removal, untrusted header replacement and English rewrites.
- `npx tsc --noEmit`.
- `npx tsx tests/cell-groups/slug.test.ts`.
- Full production Docker build with all five existing `NEXT_PUBLIC_*` build arguments.
- HTTP metadata checks across all 37 sitemap entries plus aliases, login and cell-group routes (46 requests in total).
- Production support form submissions for all three tiers, Stripe session details, monthly prices, return URLs and hosted checkout availability. Verification sessions are unpaid and expired immediately afterwards; no payments or subscriptions were completed.

## Deployment

Target: `ca-testimony-prod` in `rg-gracestack-testimony-prod`.

Published image tag: `acrtestimonysc.azurecr.io/testimony-web:seo-20260926`.

Deployed immutable image: `acrtestimonysc.azurecr.io/testimony-web@sha256:76d954c8c6da970d8763e23424fe44aaf8a13eff7c90774a8e841c764abe7c01`.

Previous image for rollback: `acrtestimonysc.azurecr.io/testimony-web@sha256:16d8b072e01510b7c7d6df7a270f3bc9c17f13544c120e0d0266d189006688cb`.

Revision `ca-testimony-prod--seo-20260926` is Healthy and Running, receiving 100% of traffic. All 46 production metadata checks passed, including all 37 sitemap URLs. Each support form returned HTTP 303 to a Stripe checkout page returning HTTP 200, with the correct monthly amount and return URLs. All three post-deployment verification sessions were expired without payment.

The home, login, feed, Bible AI, support and same-origin auth health endpoints returned HTTP 200. Auth gateway health and CORS passed. Client JavaScript contains the existing configured public auth URL and key. The apex domain redirects to `www.testimony.se` while preserving the page path.

All 30 runtime environment settings and secret references match the previous revision. Replica limits and scale rules are unchanged. Azure returned explicit default cooldown/polling intervals and normalized optional environment fields during the update.

Google Search Console ownership was verified through DNS earlier in this session. Google's reports will reflect the canonical fixes after recrawling the pages.

The developer VM was temporarily started to recover current production source, then returned to `PowerState/deallocated`. The temporary managed run-command containing the protected registry token was deleted.

## Stripe troubleshooting

If support checkout returns 500 again, inspect the server error and check both `price.active` and `price.product.active` in the same live Stripe account. An active price alone is insufficient. Verify the three configured amounts and the existing webhook before replacing any identifiers or credentials.
