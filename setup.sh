#!/usr/bin/env bash
# One-time setup for Analytiq AI (macOS / Linux).
# Run once after cloning. To start the servers afterwards: ./start.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

step()  { echo; echo ">> $1"; }
ok()    { echo "   OK  $1"; }
warn()  { echo "   WARN $1"; }
fail()  { echo "   FAIL $1"; exit 1; }

echo ""
echo "============================================"
echo "  Analytiq AI — Project Setup (Unix)       "
echo "============================================"

# ── 1. Python version check ──────────────────────────────────────────────────
step "Checking Python version"
PYTHON=$(command -v python3 || command -v python || fail "Python not found. Install Python 3.11+.")
PY_VER=$("$PYTHON" -c "import sys; print(sys.version_info[:2])")
MAJOR=$("$PYTHON" -c "import sys; print(sys.version_info.major)")
MINOR=$("$PYTHON" -c "import sys; print(sys.version_info.minor)")
if [ "$MAJOR" -lt 3 ] || { [ "$MAJOR" -eq 3 ] && [ "$MINOR" -lt 11 ]; }; then
    fail "Python 3.11+ required (found $PY_VER). Please upgrade."
fi
ok "$("$PYTHON" --version)"

# ── 2. Node version check ────────────────────────────────────────────────────
step "Checking Node.js version"
NODE_VER=$(node --version 2>/dev/null) || fail "Node.js not found. Install Node 22+."
NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR" -lt 22 ]; then
    warn "Node 22+ recommended (found $NODE_VER). Proceeding anyway."
else
    ok "$NODE_VER"
fi

# ── 3. .env.local ────────────────────────────────────────────────────────────
step "Configuring environment"
if [ ! -f "$ROOT/.env.local" ]; then
    cp "$ROOT/.env.example" "$ROOT/.env.local"
    ok ".env.local created from .env.example"
else
    ok ".env.local already exists"
fi

# Generate INTERNAL_API_KEY if still empty
if grep -qE "^INTERNAL_API_KEY=\s*$" "$ROOT/.env.local"; then
    RANDOM_KEY=$("$PYTHON" -c "import secrets, base64; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())")
    sed -i.bak "s|^INTERNAL_API_KEY=\s*$|INTERNAL_API_KEY=$RANDOM_KEY|" "$ROOT/.env.local"
    sed -i.bak "s|^NEXT_PUBLIC_INTERNAL_API_KEY=\s*$|NEXT_PUBLIC_INTERNAL_API_KEY=$RANDOM_KEY|" "$ROOT/.env.local"
    rm -f "$ROOT/.env.local.bak"
    ok "Generated INTERNAL_API_KEY and wrote to .env.local"
else
    ok "INTERNAL_API_KEY already set"
fi

# Warn about blank API keys (don't print values)
for KEY in APIFY_API_KEY OPENAI_API_KEY GOOGLE_API_KEY; do
    if grep -qE "^${KEY}=\s*$" "$ROOT/.env.local"; then
        warn "$KEY is not set in .env.local — some features will be disabled"
    fi
done

# ── 4. Python virtual environment ────────────────────────────────────────────
step "Setting up Python virtual environment"
VENV="$ROOT/.venv"
if [ ! -f "$VENV/bin/python" ]; then
    "$PYTHON" -m venv "$VENV"
    ok "Created venv at .venv"
else
    ok "venv already exists"
fi

# ── 5. Backend Python dependencies ──────────────────────────────────────────
step "Installing backend Python dependencies"
"$VENV/bin/pip" install --quiet --upgrade pip
"$VENV/bin/pip" install --quiet -r "$ROOT/backend/requirements.txt"
ok "Backend dependencies installed"

# ── 6. Database schema migration ─────────────────────────────────────────────
step "Running database schema migration"
if [ -f "$ROOT/backend/app/services/migrate_review_schema.py" ]; then
    "$VENV/bin/python" "$ROOT/backend/app/services/migrate_review_schema.py" 2>/dev/null || true
    ok "Schema migration complete"
else
    warn "Migration script not found (safe to ignore on fresh install)"
fi

# ── 7. Frontend Node dependencies ────────────────────────────────────────────
step "Installing frontend Node dependencies"
(cd "$ROOT/frontend" && npm install --silent)
ok "Frontend dependencies installed"

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Setup complete!                           "
echo "============================================"
echo ""
echo "  To start all servers:  ./start.sh"
echo "  Backend API docs:      http://localhost:8000/docs"
echo "  Frontend:              http://localhost:3000"
echo ""
echo "  IMPORTANT: Fill in APIFY_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY"
echo "  in .env.local before starting the servers."
echo ""
