# testimony.se

> En digital tidning och community för vittnesbörd, bönesvar och levande tro.
> Drivs av **Kim Tony Cedendahl** och **Sofia Cedendahl** under Gracestack AB.

*"De har besegrat honom genom Lammets blod och genom sitt vittnesbörds ord." — Uppenbarelseboken 12:11*

---

## Vad är detta

Detta är **Fas 1 MVP** enligt produktplan v4 (21 april 2026). Sajten vilar på fyra pelare:

1. **Feed** – vittnesbörd, bönesvar, böneämnen, dagens bibeltext
2. **Katalog** – verksamheter (församlingar, caféer, sociala verksamheter, läger…)
3. **Volontär** – från läsa till handla
4. **Mat** – värdig matutdelning (kommer i fas 3)

Allt användargenererat innehåll går genom en moderationskö – inget publiceras automatiskt.

## Stack

- **Next.js 16** (App Router, RSC) + **Tailwind 3**
- **Supabase** (Postgres + Auth + RLS + Storage + pgvector)
- **OpenRouter** (dagens bibeltext + bibel-RAG)
- **Stripe Checkout** för månatliga gåvor (19,90 / 99 / 199 kr)
- **Azure Container Apps** för hosting (prod)

## Dokumentation

| Fil | Innehåll |
|-----|----------|
| `PLANNING.md` | Arkitektur, pelare, roadmap |
| `TASK.md` | Aktiva uppgifter och backlog |
| `docs/DEPLOY.md` | **Azure-deploy, felsökning, checklista** |
| `docs/AUTH.md` | GoTrue/OAuth-setup |
| `docs/BIBLE-AI.md` | RAG-setup och utökning |
| `azure/AZURE.md` | Azure-infra och DNS |

## Konto & inloggning

- **Skapa konto:** `/registrera` (e-post + lösenord)
- **Logga in:** `/login`
- **Bibel-AI:** `/bibel-ai` (kräver inloggning)

## Kom igång lokalt

```bash
cp .env.example .env.local
# fyll i Supabase- och Stripe-nycklar
npm install
npm run dev
# → http://localhost:3005
```

## Supabase-setup

1. Skapa ett Supabase-projekt.
2. Kör migrationen:
   ```bash
   psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```
   Eller via Supabase SQL Editor → klistra in innehållet.
3. Aktivera **Auth → Email magic link** (default på).
4. Sätt `Site URL` = `https://testimony.se` och lägg till localhost som redirect.
5. Gör dig själv till moderator:
   ```sql
   update public.profiles set is_moderator = true where id = '<din-user-uuid>';
   ```

## Stripe-setup

1. Skapa tre **Prices** (recurring, månadsvis, SEK): 1990 öre, 9900 öre, 19900 öre.
2. Kopiera price-ID till `.env.local`.
3. Konfigurera webhook → `https://testimony.se/api/stripe/webhook`, event:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

## Deploy till Azure

```bash
set -a && source .env.local && set +a
./azure/deploy-azure.sh          # full deploy
# eller endast web:
./azure/redeploy-web.sh          # säkert — alltid med NEXT_PUBLIC build-args
```

Se **`docs/DEPLOY.md`** för runbook, vanliga fel (500, Failed to fetch, OAuth) och verifiering.  
`azure/AZURE.md` täcker DNS och infrastruktur.

**Prod-URL:** https://www.testimony.se

## Deploy till Vercel (legacy)

```bash
vercel --prod
# Domän: testimony.se (Loopia → CNAME www → cname.vercel-dns.com, A @ → 76.76.21.21)
```

Avveckla Vercel efter DNS-cutover till Azure.

Env-variabler: se `.env.example`.

## Struktur

```
app/
  page.tsx                      # Startsida: hero + blandad feed
  vittnesbord/                  # Pelare 1a
    page.tsx, [slug]/page.tsx
  bonesvar/                     # Pelare 1b
  boneamnen/                    # Pelare 1c
  dagens-bibeltext/             # Pelare 1d
  plats/                        # Pelare 2 – katalog
    page.tsx, [slug]/page.tsx
  volontar/                     # Pelare 3
    page.tsx, [slug]/page.tsx
  skriv/                        # Skrivflöde (testimonies + prayers)
  admin/moderation/             # Modkö (Kim/Sofia)
  stod/                         # Stripe-gåvor
  login/, auth/callback/
  api/stripe/{checkout,webhook}/
components/
  Header.tsx, Footer.tsx, FeedCard.tsx, PrayButton.tsx
lib/
  supabase/{client,server}.ts, stripe.ts, types.ts
supabase/
  migrations/0001_init.sql      # Hela schemat + RLS
  seed.sql                      # Café Liv, LP, Citykyrkan, Norrtullskyrkan + Kims musikvittnesbörd
middleware.ts                   # Supabase session refresh
```

## Roadmap

Se `testimonyse_produktplan.pdf` (16 sidor). Kort:

- **Fas 2**: Fler verksamheter, sökfunktion, delningar, "Jag ber"-räknare, verksamhets­admins lägger upp egna volontäruppgifter, fler musikvittnesbörd från Grace Stack Music.
- **Fas 3**: Följa, notiser, kommentarer, nyhetsbrev, PWA/app, **matutdelning** (partnerskap med restauranger/affärer, Café Liv som första hub, juridik utredd).

## Moderation – workflow

Alla inlägg skickas med `status = 'pending'` och hamnar i `moderation_queue` via trigger.
Kim/Sofia (med `profiles.is_moderator = true`) öppnar `/admin/moderation` och godkänner eller avvisar.
Godkända inlägg får `status = 'published'` och `published_at = now()`.

## Bärande principer

- **Värdighet före effektivitet.** Ingen kö, ingen skam, ingen stigmatisering.
- **Aldrig villkorad.** Tro är fri. Mat är mat. Ingen &ldquo;läs en vers för att få hjälp&rdquo;.
- **I det fördolda.** Den som ger en gåva får ingen badge, ingen tacklista, ingen skillnad.
- **Moderation framför allt.** Inget publiceras automatiskt i fas 1.

---

*"Ni är mina vittnen, säger Herren." — Jesaja 43:10*
