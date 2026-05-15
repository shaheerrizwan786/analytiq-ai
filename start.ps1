#Requires -Version 5.1
<#
.SYNOPSIS
    Start Analytiq AI — backend (FastAPI) + frontend (Next.js) in one command.
    Each server opens in its own PowerShell window.
    Run setup.ps1 first if you have not done so.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "   OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "   WARN $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "   FAIL $msg" -ForegroundColor Red }

$Root = $PSScriptRoot

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Analytiq AI - Start Servers              " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ── Pre-flight checks ─────────────────────────────────────────────────────────
Write-Step "Pre-flight checks"

# .env.local must exist
if (!(Test-Path "$Root\.env.local")) {
    Write-Fail ".env.local not found. Run .\setup.ps1 first."
    exit 1
}
Write-OK ".env.local present"

# Python venv must exist
$venvPy = "$Root\.venv\Scripts\python.exe"
if (!(Test-Path $venvPy)) {
    Write-Fail "Python venv not found. Run .\setup.ps1 first."
    exit 1
}
Write-OK "Python venv present"

# node_modules must exist
if (!(Test-Path "$Root\frontend\node_modules")) {
    Write-Fail "frontend\node_modules not found. Run .\setup.ps1 first."
    exit 1
}
Write-OK "Frontend node_modules present"

# Warn about missing API keys (never print values)
$envContent = Get-Content "$Root\.env.local" -Raw
foreach ($key in @("APIFY_API_KEY", "OPENAI_API_KEY")) {
    if ($envContent -match "(?m)^$key=\s*$") {
        Write-Warn "$key is empty - some features will not work"
    }
}

# Warn if INTERNAL_API_KEY is missing (backend still works but endpoints are unprotected)
if ($envContent -match "(?m)^INTERNAL_API_KEY=\s*$") {
    Write-Warn "INTERNAL_API_KEY is not set - API endpoints are unprotected. Run .\setup.ps1 to generate one."
}

# ── Launch backend ────────────────────────────────────────────────────────────
Write-Step "Starting backend (FastAPI on http://localhost:8000)"

$backendScript = @"
Set-Location '$Root\backend'
& '$Root\.venv\Scripts\Activate.ps1'
Write-Host '  Backend starting...' -ForegroundColor Cyan
uvicorn app.main:app --reload --port 8000
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript

Write-OK "Backend window launched"

# ── Launch frontend ───────────────────────────────────────────────────────────
Write-Step "Starting frontend (Next.js on http://localhost:3000)"

$frontendScript = @"
Set-Location '$Root\frontend'
Write-Host '  Frontend starting...' -ForegroundColor Cyan
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript

Write-OK "Frontend window launched"

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Both servers are starting up             " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:         http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API:      http://localhost:8000" -ForegroundColor White
Write-Host "  API docs:         http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "  Close the two server windows to stop." -ForegroundColor DarkGray
Write-Host ""
