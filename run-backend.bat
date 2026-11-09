@echo off
title SOC TIP - Backend Server
cd /d "%~dp0backend"
set PYTHONPATH=%~dp0backend
if not exist "venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv venv
    venv\Scripts\pip install -r requirements.txt
)
echo Starting FastAPI Backend on http://0.0.0.0:8000...
echo Interactive Swagger Docs available at: http://0.0.0.0:8000/docs
venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
pause

