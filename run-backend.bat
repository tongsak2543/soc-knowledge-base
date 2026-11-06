@echo off
title SOC TIP - Backend Server
cd /d "%~dp0backend"
set PYTHONPATH=%~dp0backend
if not exist "venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv venv
    venv\Scripts\pip install -r requirements.txt
)
echo Starting FastAPI Backend on http://127.0.0.1:8000...
echo Interactive Swagger Docs available at: http://127.0.0.1:8000/docs
venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
pause

