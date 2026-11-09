@echo off
title Stop SOC Servers
echo ==========================================================
echo  Stopping SOC Knowledge Base & IOC Repository
echo ==========================================================

echo Terminating uvicorn, python, and node servers on ports 8000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo Stopping Backend PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo Stopping Frontend PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo All services stopped successfully!
pause

