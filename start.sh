#!/usr/bin/env bash
# Start Analytiq AI — backend (FastAPI) + frontend (Next.js) in one command.
# Run setup.sh first if you have not done so.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

step()  { echo; echo ">> $1"; }
ok()    { echo "   OK  $1"; }
warn()  { echo "   WARN $1"; }
fail()  { echo "   FAIL $1"; exit 1; }

echo ""
echo "============================================"
echo "  Analytiq AI — Start Servers              "
echo "============================================"

# ── Pre-flight checks ────────────────────────────────────────────────────────
step "Pre-flight checks"

[ -f "$ROOT/.env.local" ]             || fail ".env.local not found. Run ./setup.sh first."
ok ".env.local present"

[ -f "$ROOT/.venv/bin/python" ]       || fail "Python venv not found. Run ./setup.sh first."
ok "Python venv present"

[ -d "$ROOT/frontend/node_modules" ]  || fail "frontend/node_modules not found. Run ./setup.sh first."
ok "Frontend node_modules present"

# Warn about missing API keys (never print values)
for KEY in APIFY_API_KEY OPENAI_API_KEY; do
    if grep -qE "^${KEY}=\s*$" "$ROOT/.env.local"; then
        warn "$KEY is empty — some features will not work"
    fi
done

if grep -qE "^INTERNAL_API_KEY=\s*$" "$ROOT/.env.local"; then
    warn "INTERNAL_API_KEY is not set — API endpoints are unprotected. Run ./setup.sh to generate one."
fi

# ── Cleanup on exit ──────────────────────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo ">> Shutting down servers..."
    [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
    echo "   Done."
}
trap cleanup EXIT INT TERM

# ── Launch backend ────────────────────────────────────────────────────────────
step "Starting backend (FastAPI on http://localhost:8000)"

(
    cd "$ROOT/backend"
    source "$ROOT/.venv/bin/activate"
    exec uvicorn app.main:app --reload --port 8000
) &
BACKEND_PID=$!
ok "Backend PID $BACKEND_PID"

# ── Launch frontend ───────────────────────────────────────────────────────────
step "Starting frontend (Next.js on http://localhost:3000)"

(
    cd "$ROOT/frontend"
    exec npm run dev
) &
FRONTEND_PID=$!
ok "Frontend PID $FRONTEND_PID"

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Both servers are starting up             "
echo "============================================"
echo ""
echo "  Frontend:         http://localhost:3000"
echo "  Backend API:      http://localhost:8000"
echo "  API docs:         http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo ""

# Wait for both processes; exit if either dies unexpectedly
wait "$BACKEND_PID" "$FRONTEND_PID"
