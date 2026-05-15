#Requires -Version 5.1
<#
.SYNOPSIS
    One-time setup for Analytiq AI (Windows / PowerShell).
    Run this once after cloning. To start the servers afterwards use: .\start.ps1
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
Write-Host "  Analytiq AI - Project Setup (Windows)    " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ── 1. Python version check ───────────────────────────────────────────────────
Write-Step "Checking Python version"
try {
    $pyVer = python --version 2>&1
    if ($pyVer -match "Python (\d+)\.(\d+)") {
        $major = [int]$Matches[1]; $minor = [int]$Matches[2]
        if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 11)) {
            Write-Fail "Python 3.11+ required (found $pyVer). Please upgrade."
            exit 1
        }
        Write-OK $pyVer
    }
} catch {
    Write-Fail "Python not found. Install Python 3.11+ and ensure it is on PATH."
    exit 1
}

# ── 2. Node version check ─────────────────────────────────────────────────────
Write-Step "Checking Node.js version"
try {
    $nodeVer = node --version 2>&1
    if ($nodeVer -match "v(\d+)") {
        if ([int]$Matches[1] -lt 22) {
            Write-Warn "Node 22+ recommended (found $nodeVer). Proceeding anyway."
        } else {
            Write-OK $nodeVer
        }
    }
} catch {
    Write-Fail "Node.js not found. Install Node 22+ and ensure it is on PATH."
    exit 1
}

# ── 3. .env.local ─────────────────────────────────────────────────────────────
Write-Step "Configuring environment"
if (!(Test-Path "$Root\.env.local")) {
    Copy-Item "$Root\.env.example" "$Root\.env.local"
    Write-OK ".env.local created from .env.example"
} else {
    Write-OK ".env.local already exists"
}

# Generate INTERNAL_API_KEY if still empty
$envContent = Get-Content "$Root\.env.local" -Raw
if ($envContent -match "INTERNAL_API_KEY=\s*$" -or $envContent -match "INTERNAL_API_KEY=`n") {
    $randomKey = [Convert]::ToBase64String(
        [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
    )
    # Update both INTERNAL_API_KEY and NEXT_PUBLIC_INTERNAL_API_KEY
    $envContent = $envContent -replace "(?m)^INTERNAL_API_KEY=\s*$", "INTERNAL_API_KEY=$randomKey"
    $envContent = $envContent -replace "(?m)^NEXT_PUBLIC_INTERNAL_API_KEY=\s*$", "NEXT_PUBLIC_INTERNAL_API_KEY=$randomKey"
    Set-Content "$Root\.env.local" $envContent -NoNewline
    Write-OK "Generated INTERNAL_API_KEY and wrote to .env.local"
} else {
    Write-OK "INTERNAL_API_KEY already set"
}

# Warn about blank API keys (don't print values)
foreach ($key in @("APIFY_API_KEY", "OPENAI_API_KEY", "GOOGLE_API_KEY")) {
    if ($envContent -match "(?m)^$key=\s*$") {
        Write-Warn "$key is not set in .env.local - some features will be disabled"
    }
}

# ── 4. Python virtual environment ─────────────────────────────────────────────
Write-Step "Setting up Python virtual environment"
$venvPath = "$Root\.venv"
if (!(Test-Path "$venvPath\Scripts\python.exe")) {
    python -m venv $venvPath
    Write-OK "Created venv at .venv"
} else {
    Write-OK "venv already exists"
}

# ── 5. Backend Python dependencies ────────────────────────────────────────────
Write-Step "Installing backend Python dependencies"
& "$venvPath\Scripts\pip.exe" install --quiet --upgrade pip
& "$venvPath\Scripts\pip.exe" install --quiet -r "$Root\backend\requirements.txt"
Write-OK "Backend dependencies installed"

# ── 6. Database schema migration ──────────────────────────────────────────────
Write-Step "Running database schema migration"
try {
    & "$venvPath\Scripts\python.exe" "$Root\backend\app\services\migrate_review_schema.py" 2>&1 | Out-Null
    Write-OK "Schema migration complete"
} catch {
    Write-Warn "Migration script not found or failed (safe to ignore on fresh install)"
}

# ── 7. Frontend Node dependencies ─────────────────────────────────────────────
Write-Step "Installing frontend Node dependencies"
Push-Location "$Root\frontend"
npm install --silent
Pop-Location
Write-OK "Frontend dependencies installed"

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Setup complete!                           " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  To start all servers:  .\start.ps1" -ForegroundColor White
Write-Host "  Backend API docs:      http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Frontend:              http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "  IMPORTANT: Fill in APIFY_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY" -ForegroundColor Yellow
Write-Host "  in .env.local before starting the servers." -ForegroundColor Yellow
Write-Host ""
