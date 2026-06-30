# Deploy — testimony.se (Azure)

> **Läsmål:** Undvik de misstag som gav 500 på hela sajten, "Failed to fetch" vid login och trasig Google OAuth.  
> **Senast verifierat:** 2026-06-22

---

## Arkitektur (prod)

```
www.testimony.se
       │
       ▼
ca-testimony-prod          ← Next.js (testimony-web:latest)
       │
       │  NEXT_PUBLIC_SUPABASE_URL pekar hit ↓
       ▼
ca-testimony-api           ← nginx gateway (testimony-api-gateway:latest)
   ├── /auth/v1/*  → ca-testimony-gotrue   (GoTrue)
   └── /rest/v1/*  → ca-testimony-postgrest (PostgREST)
       │
       ▼
psql-testimony-prod        ← Azure PostgreSQL (schema testimony + auth)
```

| Container App | Image | Syfte |
|---|---|---|
| `ca-testimony-prod` | `testimony-web:latest` | Webb (Next.js) |
| `ca-testimony-api` | `testimony-api-gateway:latest` | Auth/REST-proxy + **CORS** |
| `ca-testimony-gotrue` | `supabase/gotrue:v2.170.0` | Inloggning, OAuth |
| `ca-testimony-postgrest` | `postgrest/postgrest:v12.2.3` | REST API |

**RG:** `rg-gracestack-testimony-prod` · **Region:** `swedencentral` · **ACR:** `acrtestimonysc`

---

## Gyllene regler (läs först)

### 1. Bygg web **alltid** med `--build-arg`

Next.js bakar `NEXT_PUBLIC_*` in i **middleware och klientbundle vid build-tid**.  
Runtime-env på Container App **räcker inte** om image byggdes utan args.

**Symptom om fel:** Hela sajten → `500 Internal Server Error`, logg:

```text
Your project's URL and Key are required to create a Supabase client!
```

**Gör aldrig:**

```bash
az acr build --registry acrtestimonysc --image testimony-web:latest .
# ↑ UTAN --build-arg → trasig prod
```

**Gör istället:** `./azure/deploy-azure.sh` eller `./azure/redeploy-web.sh`

### 2. Uppdatera bara image räcker — om image är korrekt byggd

```bash
az containerapp update ... --image ... --revision-suffix namn
```

behåller env/secrets, men **ersätter inte** felaktig build. Bygg om först.

### 3. Auth-gateway måste ha CORS för `www.testimony.se`

GoTrue svarar ibland `Access-Control-Allow-Origin: *` + `credentials: true` → webbläsaren blockerar → **"Failed to fetch"** vid login.

CORS hanteras i `azure/auth-api/nginx.conf`. Efter ändring:

```bash
az acr build --registry acrtestimonysc --image testimony-api-gateway:latest azure/auth-api
az containerapp update -g rg-gracestack-testimony-prod -n ca-testimony-api \
  --image acrtestimonysc.azurecr.io/testimony-api-gateway:latest \
  --revision-suffix cors-fix
```

### 4. GoTrue kräver DB `search_path` + Google redirect URI

| Problem | Fix |
|---|---|
| `Database error querying schema` / `relation "users" does not exist` | `ALTER ROLE testimonyadmin SET search_path TO auth, public, testimony;` (körs av `deploy-auth-api.sh`) |
| `Unsupported provider: missing redirect URI` | `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://ca-testimony-api.../auth/v1/callback` |
| `Invalid login credentials` (migrerade konton) | `aud` ska vara `''` (matchar GoTrue default JWT aud). `role` ska vara `authenticated` (krävs av PostgREST). Kör `0011_auth_aud_role_fix.sql`. |
| `missing destination name oauth_client_id in *models.Session` vid refresh | Auth-schema nyare än GoTrue v2.170 — kör `supabase/migrations/0010_gotrue_session_compat.sql` (tar bort extra session-kolumner). Uppgradera **inte** till GoTrue v2.190+ utan full auth-migrering. |
| Inloggad i menyn men `/konto` → login igen | Session refresh trasig (ovan) — SSR ser ingen användare |

Se `docs/AUTH.md` för OAuth-detaljer.

---

## Förutsättningar

```bash
az login --tenant ace8b768-ba8f-4023-94bd-d7e75ade6c2a
cd ~/CascadeProjects/testimony
set -a && source .env.local && set +a
```

### Obligatoriska variabler i `.env.local` (prod)

| Variabel | Används vid |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Build** + runtime — Auth API URL (gateway) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Build** + runtime |
| `NEXT_PUBLIC_SITE_URL` | Build (`https://www.testimony.se`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server secrets |
| `DATABASE_URL` | Server + GoTrue/PostgREST |
| `AZURE_OPENAI_ENDPOINT` + `AZURE_OPENAI_API_KEY` | AI (Azure OpenAI, prod) |
| `OPENROUTER_API_KEY` | AI-fallback (valfritt) |
| `CRON_SECRET` | Cron-endpoints |
| `STRIPE_*`, `VAPID_*`, `RESEND_API_KEY` | Betalning, push, mail |

`NEXT_PUBLIC_SUPABASE_URL` ska vara:

```text
https://ca-testimony-api.livelyflower-b897116b.swedencentral.azurecontainerapps.io
```

(utan `/auth/v1` — Supabase-klienten lägger till det själv)

---

## Standard-deploy (rekommenderat)

### Hela webben + secrets + cron

```bash
./azure/deploy-azure.sh
```

Gör i ordning:
1. `az acr build` **med alla** `NEXT_PUBLIC_*` build-args
2. Uppdaterar `ca-testimony-prod` image + env + secrets
3. Cron-jobb

### Endast webb (snabb, säker)

```bash
./azure/redeploy-web.sh
```

Samma build-args som full deploy, utan bicep/cron.

### Auth API (GoTrue + PostgREST + gateway)

```bash
./azure/deploy-auth-api.sh
```

Kör vid:
- ny Auth-cutover
- GoTrue/PostgREST-config
- nginx/CORS-ändringar (bygg gateway separat, se regel 3)

---

## SQL-migrationer (Azure PG)

```bash
set -a && source .env.local && set +a
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0009_feed_weekly_digests.sql
```

Efter RAG-migration:

```bash
node scripts/ingest-bible-chunks.mjs
```

---

## Cron-jobb

| Jobb | Endpoint | Schema |
|---|---|---|
| Dagens bibeltext | `GET /api/cron/daily-bible` | Dagligen 05:00 UTC |
| YouTube-cache | `GET /api/cron/youtube` | Dagligen 06:00 UTC |
| Notiser | `GET /api/cron/notifications/dispatch` | Dagligen 07:00 UTC |
| Veckosammanfattning | `GET /api/cron/weekly-digest` | Måndagar (manuell tills job skapats) |

Manuell körning:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.testimony.se/api/cron/daily-bible?force=1"
```

Uppdatera jobb-URL:

```bash
./azure/deploy-cron-jobs.sh https://www.testimony.se "$CRON_SECRET"
```

---

## Verifiering efter deploy

Kör alltid detta innan du säger "klart":

```bash
# HTTP-status
for p in / /login /flode /bibel-ai; do
  curl -sS -o /dev/null -w "${p}:%{http_code}\n" "https://www.testimony.se${p}"
done

# Auth API
API=https://ca-testimony-api.livelyflower-b897116b.swedencentral.azurecontainerapps.io
curl -sS -o /dev/null -w "auth:%{http_code}\n" "$API/auth/v1/health"

# CORS preflight (ska innehålla access-control-allow-origin: https://www.testimony.se)
curl -sS -D - -o /dev/null -X OPTIONS "$API/auth/v1/token" \
  -H "Origin: https://www.testimony.se" \
  -H "Access-Control-Request-Method: POST" \
  | grep -i access-control-allow-origin

# Baked Supabase URL i klient (ska visa ca-testimony-api)
CHUNK=$(curl -sS https://www.testimony.se/login | grep -oP '/_next/static/chunks/app/login/page-[^"]+\.js' | head -1)
curl -sS "https://www.testimony.se$CHUNK" | grep -o 'ca-testimony-api[^"]*' | head -1

# Login API (ersätt lösenord)
curl -sS -X POST "$API/auth/v1/token?grant_type=password" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"..."}' \
  | jq '{ok: (.access_token != null), msg: .msg}'
```

**Förväntat:** alla sidor `200`, CORS-header med `www.testimony.se`, chunk innehåller `ca-testimony-api`.

### Loggar vid fel

```bash
az containerapp logs show -g rg-gracestack-testimony-prod -n ca-testimony-prod --tail 30
az containerapp logs show -g rg-gracestack-testimony-prod -n ca-testimony-api --tail 30
az containerapp logs show -g rg-gracestack-testimony-prod -n ca-testimony-gotrue --tail 30
```

---

## Felsökningsmatris

| Symptom | Trolig orsak | Åtgärd |
|---|---|---|
| Alla sidor 500 | Web image utan `NEXT_PUBLIC_*` build-args | `./azure/redeploy-web.sh` |
| Login: "Failed to fetch" | CORS på gateway | Uppdatera `nginx.conf`, deploy gateway |
| Google: `missing redirect URI` | Saknar `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI` | `deploy-auth-api.sh` eller manuell env |
| Google: `redirect_uri_mismatch` | URI saknas i Google Console (projekt **emiliocedendahl**) | Lägg till `https://www.testimony.se/auth/v1/callback` — se `scripts/google-oauth-fix.md` |
| Google: `invalid_client` / login kraschar efter Google | Fel `GOTRUE_EXTERNAL_GOOGLE_SECRET` i ACA | Synka från Supabase Cloud eller GCP Console → `az containerapp secret set` + restart GoTrue |
| Auth: `Database error querying schema` | GoTrue `search_path` | `ALTER ROLE ... search_path` |
| Auth: `Invalid login credentials` (API OK) | Migrerat konto fel `aud`/`role` | `aud=''`, `role='authenticated'` — se `0011_auth_aud_role_fix.sql` |
| AI: 503 | AI-provider saknas i CA secrets | `azure/setup-openai.sh` + `redeploy-web.sh` |
| Apex HTTPS | Cert Pending / Failed | `azure/fix-apex-ssl.sh` (Loopia TXT + bind) |
| Lösenordsåterställning | GoTrue saknar SMTP | Sätt `RESEND_API_KEY`, kör `deploy-auth-api.sh` |
| deploy-azure.sh steg 4 failar | Tom secret (t.ex. resend) | Fyll `.env.local` eller ta bort tom secret |

---

## Revision-namn (konvention)

| Suffix | Innehåll |
|---|---|
| `global1`, `digest1` | Feature-deploy |
| `fix500` | Build-args-fix |
| `cors1` | Gateway CORS |
| `ai1` | AI-features |

```bash
az containerapp update ... --revision-suffix beskrivande-namn
```

---

## DNS & domän

- **Använd `https://www.testimony.se`** i prod (apex SSL kan fortfarande vara under uppsättning).
- Middleware redirectar `testimony.se` → `www.testimony.se`.
- Loopia-script: `azure/loopia_dns.py` — se `azure/AZURE.md`.

---

## Checklista för AI/Cursor-agenter

Innan du deployar web:

- [ ] `source .env.local` — verifiera `NEXT_PUBLIC_SUPABASE_URL` och `ANON_KEY`
- [ ] Använd `deploy-azure.sh` eller `redeploy-web.sh` — **aldrig** naket `az acr build` utan args
- [ ] Efter deploy: curl `/`, `/login` → 200
- [ ] Verifiera CORS om auth ändrats
- [ ] Kör SQL-migration om nya `supabase/migrations/*.sql` finns
- [ ] Uppdatera inte GoTrue utan att kontrollera `search_path` och Google redirect URI

---

## Relaterad dokumentation

| Fil | Innehåll |
|---|---|
| `azure/AZURE.md` | Infra, DNS, kostnad |
| `azure/deploy-azure.sh` | Full pipeline |
| `azure/redeploy-web.sh` | Säker web-only deploy |
| `azure/deploy-auth-api.sh` | GoTrue + PostgREST + gateway |
| `docs/AUTH.md` | Login, OAuth, redirect URLs |
| `docs/BIBLE-AI.md` | RAG, ingest, rate limits |
