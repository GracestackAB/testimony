# testimony.se — Tasks

## 2026-09-26 — Canonical URLs and support checkout

- [x] Generate page-specific canonical, alternate and Open Graph URLs, including English aliases.
- [x] Verify the production build and publish the metadata fix to Azure (`seo-20260926`): 46 live metadata checks passed, including all 37 sitemap URLs; all 149 existing routes preserved.
- [x] Restore the inactive Stripe support product and verify all three monthly amounts with unpaid, expired test sessions.

## 2026-07-08 — Cellgrupper (privata grupper + inbjudan)

- [x] Migration `0021_cell_groups` (cell_groups, members, invites) — körd på Azure PG
- [x] `/cellgrupper` — lista, `/cellgrupper/nya` — skapa, `/cellgrupper/[slug]` — medlemmar + inbjudningslänkar
- [x] `/bjud-in-cell/[token]` — acceptera inbjudan
- [x] Production cell-group creation and leadership verified.
- [x] Azure-redeploy cellgrupper

## 2026-07-08 — iOS PWA safe-area + deploy-dokumentation

- [x] `safe-top` / safe-area CSS för header och mobilmeny (iOS hemskärms-app)
- [x] Azure-redeploy `ios-safe-area` (prod uppdateras via `./azure/redeploy-web.sh`, inte Vercel)
- [x] `docs/DEPLOY.md` — tydlig varning: prod = Azure, git push räcker inte

## 2026-06-24 — Min andakt (privat journal)

- [x] `spiritual_journal_entries` + RLS (8 kategorier)
- [x] `/min-andakt` — tacksamhet, bön, bekännelse, reflektion, löften, verser, bönesvar, troväxt
- [x] API CRUD, GDPR-export, menylänk

## 2026-06-23 — Drift & innehåll

- [x] Azure OpenAI prod (`oai-testimony-sc`)
- [x] Google OAuth + Resend SMTP på GoTrue
- [x] Cron: daily-bible, weekly-digest, youtube, notifications
- [x] Bibel-RAG: 104 indexerade stycken
- [x] Läsplan 365 dagar
- [x] AI-granskning dagens bibeltext (`DAILY_BIBLE_AI_REVIEW=true` + admin Godkänn)
- [x] Moderator-notis vid cron-fel och pending-granskning
- [x] Prod revision `review`
- [x] Apex SSL — HTTP-validering + bind (`cert-testimony-apex`, SniEnabled)

## Klart sedan tidigare

- [x] Tvåspråkighet sv/en, URL-alias, nätverk/flöde/grupper
- [x] Auth (e-post, Google), Azure PG, GoTrue+PostgREST+gateway
- [x] Bibel-AI, skrivhjälp, moderations-AI, veckosammanfattning
- [x] `docs/DEPLOY.md`, `azure/redeploy-web.sh`

## Ej påbörjat (kräver dig / licens)

- [ ] Avveckla Supabase Cloud + Vercel
- [ ] Importera full SFB (licens)

## Discovered During Work

- Apex-cert: använd `loopia_apex_txt.py` (rör inte www TXT/CNAME)
- `gpt-4.1-mini` på Azure (gpt-4o-mini deprecated)
- [x] 2026-06-27 — Bibeltext: in-app notis till moderator + admin-badge för pending (cron genererade men ingen feedback)
- [x] 2026-06-27 — API.Bible-integration för exakta verscitat (CSB → svensk översättning via AI)
- [x] 2026-06-28 — Admin: lista alla användare (/admin/anvandare) + deploy users1
- [x] 2026-06-29 — Jämför översättningar (sv/en/he/gr) på dagens bibeltext + Bibel-AI källspråk
- [x] 2026-06-28 — Andaktsflöde: dagens vers på startsidan, spara till Min andakt, Bibel-AI uppföljningsfrågor

## 2026-07-04 — Barnens bibelspel (4+)

- [x] `/spel/barn` — tryck-spel med emojis, stora knappar, mobilvänligt
- [x] 16 bibelberättelser, 8 frågor per omgång, sv/en
- [x] `/spel/bibel-duell` — ungdomsquiz med topplista + 1v1-utmaningar (migration `0018_youth_bible_duel`)
- [x] `/spel/bibel-aventyr` — vuxet textäventyr (Bibel-krönika): inventarie, tro-mätare, AI, 3 sparplatser (migration `0019_bible_adventure_saves`)
  - [x] Föremål-användning, bönbön, skriftkodex, milstolpar, slutbetyg, val-ton, dela krönika
  - [x] Co-op: bjud in vän, växlande turer, notis (migration `0020_bible_adventure_coop`)
  - [x] D&D-inspirerat: arketypval, dygder, d20-prov, inspiration, XP/nivå, uppdragslogg
  - [x] Livskraft (HP): skada vid misslyckade slag, vila, läkning via föremål, utmattningsslut
  - [x] Fiendeporträtt + bestiarium (9 bilder, AI encounterId per scenario)
  - [x] Engagement: fiende-HP-strid, spänningsmätare, kapitel, kritiska slag, atmosfär
  - [x] Ultimat förmåga per arketyp (en gång/äventyr), NPC-allierade med porträtt, procedural atmosfärljud (deploy `bibelultimate`)
  - [x] Allierade ger riktiga bonusar (SV-reduktion, tro/HP vid möte), fly från möte, segerbyte, ljudeffekter, buff-HUD, tärningsanimation, utökad slutstatistik (deploy `bibelcombat`)

## 2026-06-30 — Spel & Bibel Quiz

- [x] `/spel` — hub för spel (första: Bibel Quiz)
- [x] `/spel/bibel-quiz` — flervalsquiz från `passages.json`, sv/en, menylänk
- [x] Bibel Quiz: veckans topplista, nätverkslista, utmaningar + notiser (`0016_bible_quiz_social`)
- [x] `/spel/liknelser` — AI textäventyr (4 scenarier), teologiska guardrails, migration `0015_game_story_turns`
- [x] Git-repo initierat lokalt (`main`, 4 commits)
- [x] Rättvis utmaning: samma frågor via seed (`0017_bible_quiz_fair_play`)
- [x] Utmana från topplista, profilsök, avböj, returmatch, matchhistorik
- [x] Deploy prod revision `quizsocial2`
