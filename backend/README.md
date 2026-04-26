# Analytiq AI — FastAPI backend

Orchestration service (Apify → normalise → incremental persistence → LLM) lives here. Keys stay **server-side** only; read from the **repo root** `.env.local` / `.env` (same as frontend setup).

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

- Windows (PowerShell): `\.\.venv\Scripts\Activate.ps1`
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

`POST /api/v1/restaurants/analyze` runs the **Google Maps** Apify actor and now supports incremental extraction:

1. Reads the latest extracted review date for `(source=google, restaurant_name, location)` from local SQLite.
2. Requests latest reviews from Apify (tries date filter field first, auto-fallback if actor rejects it).
3. Persists only unseen reviews (dedupe by stable `review_key`) in SQLite.
4. Updates extracted date range.

**Cost control:** defaults are intentionally small (`APIFY_MAX_REVIEWS=8`, one place per search) to reduce Apify usage. Increase only when needed.

**Required in repo root `.env.local`:**

```env
APIFY_API_KEY=apify_api_...
```

**Optional overrides:**

| Variable | Default | Meaning |
|----------|---------|---------|
| `APIFY_GOOGLE_ACTOR_ID` | `compass/crawler-google-places` | Actor to run (must match input schema or change code). |
| `APIFY_MAX_REVIEWS` | `8` | Max reviews requested from actor and kept after filtering (main cost knob). |
| `APIFY_WAIT_SECS` | `900` | Max wait for run to finish (seconds). |
| `APIFY_TRY_DATE_FILTER` | `true` | Try passing a date field to actor input for incremental sync. |
| `APIFY_GOOGLE_REVIEW_START_DATE_FIELD` | `reviewsStartDate` | Actor input field name used when date filtering is enabled. |

Local incremental sync DB path:

```text
backend/data/reviews_sync.sqlite3
```

Response now includes:

- `new_reviews_count`
- `extracted_range_from`
- `extracted_range_to`

If `APIFY_API_KEY` is missing, the endpoint returns **503** with a clear message.

## Next implementation steps

1. **LLM**: map normalized review text + ratings into `top_issues` / `recommendations` via Claude.
2. **Primary DB**: port local SQLite sync tables to PostgreSQL/Supabase for shared team environment.
3. **More sources**: add Yelp / TripAdvisor services with the same incremental sync contract.
4. **Chat**: e.g. `POST /api/v1/chat` with insights JSON as context.
