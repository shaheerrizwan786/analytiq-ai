# Analytiq AI — FastAPI backend

Orchestration service (Apify → normalise → PostgreSQL → LLM) lives here. Keys stay **server-side** only; read from the **repo root** `.env.local` / `.env` (same as frontend setup).

## Prerequisites

- Python **3.11+** recommended
- Optional: PostgreSQL / Supabase when you wire `DATABASE_URL`

## Setup (Windows / macOS / Linux)

From repository root:

```bash
cd backend
python -m venv .venv
```

Activate:

- Windows (PowerShell): `.\.venv\Scripts\Activate.ps1`
- macOS/Linux: `source .venv/bin/activate`

Install:

```bash
pip install -r requirements.txt
```

Ensure repo root has `.env.local` (copy from `.env.example` at repo root if needed).

## Run

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- OpenAPI docs: http://localhost:8000/docs  
- Health: http://localhost:8000/health  

## CORS

Default allowed origin: `http://localhost:3000` (Next dev server).

Override with comma-separated list in repo root `.env.local`:

```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Frontend integration

Point the Next app at this API (example):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Then `POST ${NEXT_PUBLIC_API_BASE_URL}/api/v1/restaurants/analyze` with JSON `{ "name": "...", "location": "..." }`.

## Apify (Google Maps reviews)

`POST /api/v1/restaurants/analyze` runs the **Google Maps** Apify actor, normalises reviews, and fills `insights.sources.google` plus rough sentiment from star ratings (issues/recommendations stay placeholder until the LLM step).

**Cost:** defaults are intentionally small (`APIFY_MAX_REVIEWS=8`, one place per search) to reduce Apify usage. Increase only when you need more signal for demos or LLM input.

**Required in repo root `.env.local`:**

```env
APIFY_API_KEY=apify_api_...
```

**Optional overrides:**

| Variable | Default | Meaning |
|----------|---------|---------|
| `APIFY_GOOGLE_ACTOR_ID` | `compass/crawler-google-places` | Actor to run (must match input schema or change code). |
| `APIFY_MAX_REVIEWS` | `8` | Max reviews requested from the actor and kept after normalisation (main cost knob). |
| `APIFY_WAIT_SECS` | `900` | Max wait for the run to finish (seconds). |

Subscribe to / pay for the actor in [Apify Console](https://console.apify.com/) (runs consume credits). The response includes `apify_dataset_url` so you can inspect rows in Apify Storage.

If `APIFY_API_KEY` is missing, the endpoint returns **503** with a clear message.

## Next implementation steps

1. **LLM**: map `GoogleReviewNormalized` text + ratings into `top_issues` / `recommendations` via Claude (see `CLAUDE_API_KEY`).
2. **Persistence**: add `sqlalchemy` + `psycopg[binary]`, models + migrations; use `DATABASE_URL`.
3. **More sources**: additional Apify actors for Yelp / TripAdvisor + normalisers (extend `SourceCounts`).
4. **Chat**: e.g. `POST /api/v1/chat` with insights JSON as context.
