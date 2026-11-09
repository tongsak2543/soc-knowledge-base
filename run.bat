@echo off
title SOC Knowledge Base & IOC Repository
echo ==========================================================
echo  Starting Internal SOC Knowledge Base & IOC Repository
echo ==========================================================

:: 1. Start Backend
echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000...
cd /d "%~dp0backend"
set PYTHONPATH=%~dp0backend
start "SOC-Backend-API" /min "%~dp0backend\venv\Scripts\uvicorn.exe" app.main:app --host 127.0.0.1 --port 8000 --reload

:: 2. Start Frontend
echo [2/2] Starting Vite Frontend on http://127.0.0.1:5173...
cd /d "%~dp0frontend"
set Path=%LOCALAPPDATA%\Programs\nodejs;%Path%
start "SOC-Frontend-UI" /min cmd /c "npm run dev -- --host 127.0.0.1 --port 5173"

:: 3. Wait and open browser
timeout /t 3 /nobreak >nul
echo.
echo Opening browser...
start http://127.0.0.1:5173

echo.
echo ==========================================================
echo  All systems running!
echo  - Frontend Web UI:  http://127.0.0.1:5173
echo  - Backend API Docs: http://127.0.0.1:8000/docs
echo ==========================================================
pause

