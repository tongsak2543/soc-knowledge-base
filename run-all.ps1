# One-click startup script for Internal SOC Knowledge Base (Windows PowerShell)
$backendPath = Join-Path $PSScriptRoot "backend"
$frontendPath = Join-Path $PSScriptRoot "frontend"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Internal SOC Knowledge Base & IOC Repository" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# Start Backend in a new window
Write-Host "[1/2] Launching Backend on http://0.0.0.0:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendPath'; `$env:PYTHONPATH='$backendPath'; .\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload"

# Start Frontend in a new window
Write-Host "[2/2] Launching Frontend on http://0.0.0.0:5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendPath'; npm run dev -- --host 0.0.0.0 --port 5173"

Start-Sleep -Seconds 2
Write-Host "`nReady! Access your portal at:" -ForegroundColor Green
Write-Host "  -> Frontend Web UI:  http://127.0.0.1:5173" -ForegroundColor White
Write-Host "  -> Backend Swagger:  http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "  -> Database file:    $backendPath\tip.db" -ForegroundColor White

