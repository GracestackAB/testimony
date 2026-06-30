# Bibel-AI (RAG)

## Syfte

Svara på frågor om Bibeln och Jesus **utan att hitta på verscitat**. Modellen får endast använda indexerade källtexter.

Flerspråkigt: **svenska**, **engelska**, **hebreiska (GT)**, **grekiska (NT)**.

## Källor (public domain)

| ID | Språk | Text |
|----|-------|------|
| `swe_fol` | sv | Svenska Folkbibeln |
| `BSB` | en | Berean Standard Bible |
| `HBOMAS` | he | Hebrew Masoretic OT |
| `grc_sbl` | el | SBL Greek NT |

API: [HelloAO Free Use Bible API](https://bible.helloao.org/) — ingen nyckel, kommersiellt OK.

## Arkitektur

```
Fråga → embedding (text-embedding-3-small)
      → pgvector HNSW: testimony.bible_chunks (~120k verser)
      → Live HelloAO för explicita referenser (alla 4 översättningar)
      → gpt-4.1-mini med källor i systemprompt (sv/en)
      → Svar + källista i UI
```

## Setup

### 1. Migration

```bash
psql "$DATABASE_URL" -f supabase/migrations/0014_bible_chunks_multilingual.sql
```

### 2. Miljövariabler

```bash
AI_PROVIDER=azure
AZURE_OPENAI_ENDPOINT=https://oai-testimony-sc.openai.azure.com/
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4-1-mini
AZURE_OPENAI_EMBED_DEPLOYMENT=text-embedding-3-small
DATABASE_URL=...
```

### 3. Indexera hela Bibeln

```bash
npm run ingest:bible:full
# eller en översättning i taget:
node scripts/ingest-bible-helloao.mjs --translation BSB
```

Checkpoint: `data/bible-ingest-checkpoint.json` (återupptar vid avbrott).

Uppskattad tid: 2–4 timmar för alla fyra översättningar (~120k verser).

### 4. Deploy

```bash
REVISION_SUFFIX=bible-rag1 ./azure/redeploy-web.sh
```

## API

`POST /api/bible/ask`

```json
{ "question": "Vad betyder agape i 1 Kor 13?" }
```

Kräver inloggad användare. Svarsspråk följer användarens locale (sv/en).

## Skillnad mot API.Bible

- **RAG** använder HelloAO (public domain) — inga kommersiella begränsningar som ESV/NIV.
- **Dagens bibeltext** kan fortfarande använda API.Bible CSB för exakta citat (valfritt).

## Begränsningar

- Rate limit: 20 frågor/timme per användare
- Varning vid låg källmatchning (similarity &lt; 0.32)
- Frågor hashas i `bible_ai_queries` (GDPR)
