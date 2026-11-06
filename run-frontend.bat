@echo off
title SOC TIP - Frontend Server
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)
echo Starting React Vite Frontend on http://127.0.0.1:5173...
call npm run dev -- --host 127.0.0.1 --port 5173
pause

