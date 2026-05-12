# Analytiq AI

AI-powered restaurant feedback intelligence platform.

---

## Project Structure

```
DTE505/
├── frontend/        → Next.js (App Router, TypeScript, Tailwind CSS v4)
├── backend/         → FastAPI (orchestration, Apify/SQLite/LLM)
├── docs/            → documentation
├── setup.ps1        → one-time setup (Windows)
├── setup.sh         → one-time setup (macOS/Linux)
├── start.ps1        → start all servers (Windows)
└── start.sh         → start all servers (macOS/Linux)
```

---

## Quick Start

### 1. Prerequisites

| Requirement | Minimum version |
|-------------|----------------|
| Python      | 3.11+          |
| Node.js     | 22+            |
| npm         | 10+            |

### 2. First-time setup

**Windows (PowerShell):**
```powershell
.\setup.ps1
```

**macOS / Linux:**
```bash
chmod +x setup.sh start.sh
./setup.sh
```

This will:
- Copy `.env.example` → `.env.local`
- Auto-generate a secure `INTERNAL_API_KEY`
- Create the Python virtual environment (`.venv`)
- Install backend + frontend dependencies
- Run the database schema migration

### 3. Configure API keys

Open `.env.local` at the repo root and fill in:

```
APIFY_API_KEY=          # required for review scraping
OPENAI_API_KEY=         # required for AI analysis
GOOGLE_API_KEY=         # required for Places autocomplete
```

### 4. Start all servers

The scripts handle pre-flight checks and launch both servers for you:

**Windows:**
```powershell
.\start.ps1
```

**macOS / Linux:**
```bash
./start.sh
```

Opens (or launches in background):
- **Frontend** → http://localhost:3000
- **Backend API** → http://localhost:8000
- **API docs (Swagger)** → http://localhost:8000/docs

#### Manual start (if you prefer)

Backend — open one terminal:
```powershell
# Windows
.\.venv\Scripts\Activate.ps1
cd backend
uvicorn app.main:app --reload --port 8000
```
```bash
# macOS / Linux
source .venv/bin/activate
cd backend
uvicorn app.main:app --reload --port 8000
```

Frontend — open a second terminal:
```bash
cd frontend
npm run dev
```

---

## Environment Variables

Both services read from `.env.local` at the **repo root** (never committed to git).  
See `.env.example` for all available options.

Key variables:

| Variable | Used by | Purpose |
|----------|---------|---------|
| `APIFY_API_KEY` | Backend | Review scraping |
| `OPENAI_API_KEY` | Backend | AI analysis |
| `GOOGLE_API_KEY` | Backend | Places API |
| `INTERNAL_API_KEY` | Backend | Protects API endpoints |
| `NEXT_PUBLIC_INTERNAL_API_KEY` | Frontend | Sent with browser requests |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend URL for browser calls |
| `CORS_ORIGINS` | Backend | Allowed browser origins |

---

## Development

See `backend/README.md` and `frontend/README.md` for service-specific details.

