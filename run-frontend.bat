@echo off
title SOC TIP - Frontend Server
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)
echo Starting React Vite Frontend on http://0.0.0.0:5173...
call npm run dev -- --host 0.0.0.0 --port 5173
pause

