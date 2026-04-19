# Analytiq AI

AI-powered restaurant feedback intelligence platform.

---

## Project Structure

```
DTE505/
├── frontend/   → Next.js (App Router)
├── backend/    → FastAPI (orchestration, Apify/DB/LLM)
├── docs/       → documentation
```

---

## Setup

1. Clone the repository
2. Open in VS Code

### Environment Variables

Create a `.env.local` file at the **repository root** and copy from `.env.example`.  
Both **Next.js** and **FastAPI** read the same file (backend uses `pydantic-settings` paths to repo root).

### Backend (FastAPI)

See `backend/README.md`. Quick start:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # Windows PowerShell
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

---

> **_** 