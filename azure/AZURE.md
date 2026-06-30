# testimony.se — Azure Deployment

> RG: `rg-gracestack-testimony-prod` · Region: **swedencentral**  
> **Deploy-runbook:** [`docs/DEPLOY.md`](../docs/DEPLOY.md) ← läs denna vid varje deploy

## Arkitektur (2026-06)

```
www.testimony.se
       │
       ▼
ca-testimony-prod          Next.js (testimony-web:latest)
       │
       ▼
ca-testimony-api           nginx gateway + CORS
   ├── /auth/v1/*  → ca-testimony-gotrue
   └── /rest/v1/*  → ca-testimony-postgrest
       │
       ▼
psql-testimony-prod        Azure PostgreSQL (testimony + auth schema)
```

Externa tjänster: Stripe, OpenRouter, Resend, Loopia DNS.

## Live resources

| Resource | Name | URL / värde |
|---|---|---|
| Container App (web) | `ca-testimony-prod` | https://www.testimony.se |
| Auth API gateway | `ca-testimony-api` | https://ca-testimony-api.livelyflower-b897116b.swedencentral.azurecontainerapps.io |
| GoTrue | `ca-testimony-gotrue` | via gateway `/auth/v1` |
| PostgREST | `ca-testimony-postgrest` | via gateway `/rest/v1` |
| PostgreSQL | `psql-testimony-prod` | `DATABASE_URL` i secrets |
| Container Registry | `acrtestimonysc` | `testimony-web:latest`, `testimony-api-gateway:latest` |
| Container Apps Env | `cae-testimony` | |
| Key Vault | `kv-testimony-sc` | Secrets backup |
| Cron: YouTube | `job-testimony-youtube` | 06:00 UTC |
| Cron: Notiser | `job-testimony-notifications` | 07:00 UTC |
| Cron: Dagens bibel | `job-testimony-daily-bible` | 05:00 UTC |

## Deploy (snabbguide)

```bash
az login --tenant ace8b768-ba8f-4023-94bd-d7e75ade6c2a
cd ~/CascadeProjects/testimony
set -a && source .env.local && set +a
```

| Scenario | Kommando |
|---|---|
| **Full deploy** (web + secrets + cron) | `./azure/deploy-azure.sh` |
| **Endast web** (säkert, med build-args) | `./azure/redeploy-web.sh` |
| **Auth API** (GoTrue + gateway + CORS) | `./azure/deploy-auth-api.sh` |

**Viktigt:** Bygg aldrig `testimony-web` utan `--build-arg NEXT_PUBLIC_SUPABASE_*` — se [`docs/DEPLOY.md`](../docs/DEPLOY.md).

Valfritt revision-suffix:

```bash
REVISION_SUFFIX=feature-xyz ./azure/redeploy-web.sh
```

## DNS-cutover (Loopia → Azure)

**Prod:** `https://www.testimony.se` (HTTPS live). Apex `testimony.se` kan fortfarande sakna cert.

### Steg 1 — TXT + CNAME + A (Loopia API)

```bash
export LOOPIA_API_USER='cursor5@loopiaapi'
export LOOPIA_API_PASSWORD='…'
export ACA_STATIC_IP=135.225.11.56

python3 azure/loopia_dns.py \
  '<azure-txt-token>' \
  'ca-testimony-prod.livelyflower-b897116b.swedencentral.azurecontainerapps.io'
```

### Steg 2 — Azure custom domain + managed cert

```bash
az containerapp hostname add -g rg-gracestack-testimony-prod -n ca-testimony-prod --hostname www.testimony.se
# Apex: testimony.se — kräver TXT-validering (cert-testimony-apex)
```

### Steg 3 — efter cutover

1. **GoTrue** — `GOTRUE_SITE_URL=https://www.testimony.se` (via `deploy-auth-api.sh`)
2. **Stripe webhook** → `https://www.testimony.se/api/stripe/webhook`
3. **Google OAuth** — redirect URI i GCP: `https://ca-testimony-api.../auth/v1/callback`
4. Cron mot prod: `./azure/deploy-cron-jobs.sh https://www.testimony.se "$CRON_SECRET"`

## Secrets i `.env.local`

| Variabel | Varför |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Auth API gateway (build + runtime) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Klient auth (build + runtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin, cron, GDPR |
| `DATABASE_URL` | Azure PG |
| `AZURE_OPENAI_ENDPOINT` + `AZURE_OPENAI_API_KEY` | AI (prod, nyttjar Azure-krediter) |
| `OPENROUTER_API_KEY` | AI-fallback (valfritt) |
| `STRIPE_*`, `CRON_SECRET`, `VAPID_*`, `RESEND_API_KEY` | Övrigt |

Kopiera från `~/Desktop/CREDENTIALS_GRACESTACK.txt` — committa aldrig värden.

## Kostnad (uppskattning)

| Resurs | SEK/mån |
|---|---|
| ACR Basic | ~50 |
| Container Apps (web + auth stack) | ~400–700 |
| Azure PostgreSQL | ~300–500 |
| Log Analytics + KV | ~30–60 |
| **Totalt infra** | **~800–1300** |

Azure OpenAI (`oai-testimony-sc`) — per användning mot Azure-krediter. OpenRouter som fallback.

## Filer

| Fil | Syfte |
|---|---|
| [`docs/DEPLOY.md`](../docs/DEPLOY.md) | **Huvud-runbook**, felsökning, checklista |
| `Dockerfile` | Next.js standalone (kräver build-args) |
| `azure/deploy-azure.sh` | Full pipeline |
| `azure/redeploy-web.sh` | Säker web-only deploy |
| `azure/deploy-auth-api.sh` | GoTrue + PostgREST + nginx |
| `azure/auth-api/nginx.conf` | Gateway + CORS |
| `azure/deploy-cron-jobs.sh` | Cron-jobb |
| `azure/setup-openai.sh` | Azure OpenAI-resurs + deployments |
| `azure/loopia_dns.py` | DNS-automation |
| `docs/AUTH.md` | OAuth, redirect URLs |
