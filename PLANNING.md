# testimony.se — Projektplan & arkitektur

> Kristen community-plattform: vittnesbörd, bön, bibeltext, verksamheter.  
> Drivs av Kim & Sofia Cedendahl / Gracestack AB.

---

## Vision

Det kristna communityt och tjänstenätverket — som Facebook för tro (flöde, bön, meddelanden) och LinkedIn för tjänst (profiler, verksamheter, volontär). Globalt från dag ett med svenska + engelska.

En digital tidning och community där vanliga människor delar vad Gud gör — med värdighet, moderation och teknisk kvalitet. Tro är fri. Inget publiceras utan granskning i fas 1.

## Pelare (produkt)

| Pelare | Routes | Status |
|--------|--------|--------|
| Feed | `/`, `/vittnesbord`, `/bonesvar`, `/boneamnen`, `/dagens-bibeltext` | Live |
| Katalog | `/plats` | Live |
| Volontär | `/volontar` | Live |
| Profiler & community | `/u/[username]`, `/forum`, `/lovsang`, `/meddelanden` | Live |
| Bibel-AI (RAG) | `/bibel-ai` | MVP — kräver ingest + AI-provider |
| Mat (fas 3) | — | Planerad |

## Teknikstack

```
┌─────────────────────────────────────────────────────────┐
│  Next.js 16 (App Router, RSC) + Tailwind 3 + PWA        │
│  Azure Container Apps (prod) · Vercel (legacy)          │
└───────────────────────────┬─────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   Supabase            Stripe              Azure OpenAI
   Postgres+Auth        gåvor               bibel-AI + daglig text
   Storage+RLS          webhooks            (OpenRouter fallback)
        │
   Resend (mail) · Web Push (VAPID)
```

| Lager | Teknik |
|-------|--------|
| Frontend | Next.js 16, React 18, Tailwind |
| Auth | Supabase Auth (e-post/lösenord, magic link, Google OAuth) |
| Databas | Supabase PostgreSQL + RLS |
| Fillagring | Supabase Storage (avatarer) |
| Betalning | Stripe Checkout (månadsgåvor) |
| AI | Azure OpenAI (`gpt-4.1-mini`, `text-embedding-3-small`) — OpenRouter som fallback |
| Hosting | Azure Container Apps (`ca-testimony-prod`) |
| Cron | Azure Container Apps Jobs (curl → API) |
| DNS | Loopia → Azure |

## Autentisering

**Rekommenderat:** e-post + lösenord via `/registrera` och `/login`.

| Metod | Route | Kommentar |
|-------|-------|-----------|
| E-post + lösenord | `/registrera`, `/login` | Primärt — ska fungera överallt |
| Magic link | `/login` (flik) | Alternativ utan lösenord |
| Google OAuth | `/login` → "Andra sätt" | Kräver Supabase + Google Cloud-konfig |

Se `docs/AUTH.md` för Supabase-inställningar.

## Innehåll & moderation

- Allt UGC: `status = pending` → `moderation_queue` → godkänn/avvisa i `/admin/moderation`
- Moderatorer: `profiles.is_moderator = true`
- Dagens bibeltext: `daily_bible` — manuellt i admin ELLER automatiskt via cron

## Dagens bibeltext (automation)

1. **Läsplan** — `data/bible-reading-plan.json` (40 referenser, cyklar per år)
2. **Cron** — `GET /api/cron/daily-bible` kl 05:00 UTC (Azure job `job-testimony-daily-bible`)
3. **AI** — `lib/bible/daily.ts` genererar vers + förklaring via Azure OpenAI
4. **Publicering** — `daily_bible.status = published` för dagens datum

Manuell körning:  
`curl -H "Authorization: Bearer $CRON_SECRET" "https://www.testimony.se/api/cron/daily-bible?force=1"`

## Bibel-AI (RAG)

Anti-hallucination: svar genereras **endast** från indexerade `bible_chunks` (HelloAO: swe_fol, BSB, HBOMAS, grc_sbl), inte fri modellkunskap.

```
Användarfråga → embedding → match_bible_chunks (pgvector HNSW)
              → live HelloAO för explicita referenser
              → gpt-4.1-mini (sv/en) → svar + källista
```

| Steg | Kommando / fil |
|------|----------------|
| Migration | `supabase/migrations/0014_bible_chunks_multilingual.sql` |
| Källor | HelloAO: swe_fol, BSB, HBOMAS, grc_sbl (public domain) |
| Ingest | `npm run ingest:bible:full` |
| API | `POST /api/bible/ask` (kräver inloggning) |
| UI | `/bibel-ai` |

**Utöka kunskapsbasen:** lägg till fler passager i `passages.json` eller importera hela SFB (licens krävs) → kör ingest igen.

Se `docs/BIBLE-AI.md`.

## Azure (prod)

RG: `rg-gracestack-testimony-prod` · Region: `swedencentral`

| Resurs | Namn |
|--------|------|
| Container App | `ca-testimony-prod` |
| ACR | `acrtestimonysc` |
| Key Vault | `kv-testimony-sc` |
| Cron-jobb | `job-testimony-*` |

Deploy: `./azure/deploy-azure.sh` · DNS: `azure/loopia_dns.py`  
Detaljer: `azure/AZURE.md`

## Mappstruktur

```
app/
  page.tsx                 # Startsida
  registrera/              # Skapa konto (e-post + lösenord)
  login/                   # Logga in
  bibel-ai/                # Bibel-RAG chatt
  dagens-bibeltext/        # Redaktionell bibeltext
  vittnesbord/ bonesvar/   # Pelare 1
  plats/ volontar/         # Pelare 2–3
  skriv/ admin/ konto/     # Flöden
  api/
    bible/ask/             # RAG-frågor
    cron/daily-bible/      # Auto-bibeltext
    cron/youtube/          # YouTube-cache
lib/
  auth/ bible/ ai/ supabase/ profile/ notifications/
data/
  bible-reading-plan.json  # Daglig läsplan
  bible-seed/passages.json # RAG-seed
supabase/migrations/       # SQL-schema
azure/                     # Deploy + DNS
docs/                      # Detaljdokumentation
```

## Miljövariabler (prod)

Se `.env.example`. Kritiska:

- `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_*`, `CRON_SECRET`
- `AZURE_OPENAI_*` (bibeltext + RAG) — eller `OPENROUTER_API_KEY` som fallback
- `RESEND_API_KEY`, `VAPID_*` (notiser)

## Säkerhet & GDPR

- RLS på alla publika tabeller
- Inga hemligheter i git — `.env.local` + Azure secrets
- `bible_ai_queries` lagrar hash av fråga, inte klartext
- Kontoradering/export: `/konto/radera`, `/konto/exportera`

## Kostnad (uppskattning)

| Post | SEK/mån |
|------|---------|
| Azure Container Apps | ~300–500 |
| Supabase Pro (vid skala) | ~250+ |
| OpenRouter (AI) | ~50–200 (beroende på trafik) |
| Stripe | transaktionsavgift |

---

*Senast uppdaterad: 2026-06-22*
