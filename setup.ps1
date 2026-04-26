Write-Host "Setting up Analytiq AI..." -ForegroundColor Cyan

if (!(Test-Path ".env.local")) {
    Copy-Item ".env.example" ".env.local"
    Write-Host ".env.local created from .env.example" -ForegroundColor Yellow
}

Set-Location frontend
npm install
Set-Location ..

Write-Host ""
Write-Host "Done. Frontend: cd frontend && npm run dev  (http://localhost:3000)" -ForegroundColor Green
Write-Host "Backend:   see backend/README.md  (uvicorn on http://localhost:8000)" -ForegroundColor Green
