Write-Host "Setting up Analytiq AI..." -ForegroundColor Cyan

if (!(Test-Path ".env.local")) {
    Copy-Item ".env.example" ".env.local"
    Write-Host ".env.local created from .env.example" -ForegroundColor Yellow
}

Set-Location frontend
npm install
Set-Location ..

Write-Host ""
Write-Host "Done. Run 'cd frontend && npm run dev' to start." -ForegroundColor Green
