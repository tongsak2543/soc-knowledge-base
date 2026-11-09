#!/usr/bin/env bash
# ==============================================================================
# One-Click Startup Script for Internal SOC Knowledge Base (Bash / Git Bash / Linux)
# ==============================================================================

# Determine project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Text Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}==========================================================${NC}"
echo -e "${GREEN} Starting Internal SOC Knowledge Base & Live Feeds Portal ${NC}"
echo -e "${CYAN}==========================================================${NC}"

# Check for Python virtual environment
PYTHON_CMD=""
UVICORN_CMD=""

if [ -f "$BACKEND_DIR/venv/Scripts/uvicorn.exe" ]; then
    # Windows Git Bash / MinGW
    PYTHON_CMD="$BACKEND_DIR/venv/Scripts/python.exe"
    UVICORN_CMD="$BACKEND_DIR/venv/Scripts/uvicorn.exe"
elif [ -f "$BACKEND_DIR/venv/bin/uvicorn" ]; then
    # Linux / macOS / WSL
    PYTHON_CMD="$BACKEND_DIR/venv/bin/python"
    UVICORN_CMD="$BACKEND_DIR/venv/bin/uvicorn"
else
    echo -e "${YELLOW}[!] Python virtual environment not found in $BACKEND_DIR/venv.${NC}"
    echo -e "${YELLOW}    Creating venv and installing requirements...${NC}"
    python3 -m venv "$BACKEND_DIR/venv" || python -m venv "$BACKEND_DIR/venv"
    if [ -f "$BACKEND_DIR/venv/Scripts/pip.exe" ]; then
        "$BACKEND_DIR/venv/Scripts/pip.exe" install -r "$BACKEND_DIR/requirements.txt"
        UVICORN_CMD="$BACKEND_DIR/venv/Scripts/uvicorn.exe"
    else
        "$BACKEND_DIR/venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
        UVICORN_CMD="$BACKEND_DIR/venv/bin/uvicorn"
    fi
fi

# Detect npm
NPM_CMD="npm"
if command -v npm.cmd &> /dev/null; then
    NPM_CMD="npm.cmd"
fi

# Process cleanup handler on exit (Ctrl+C)
cleanup() {
    echo -e "\n${YELLOW}Shutting down SOC Portal services...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null
    fi
    # Extra port cleanup
    if command -v fuser &> /dev/null; then
        fuser -k 8000/tcp 2>/dev/null
        fuser -k 5173/tcp 2>/dev/null
    fi
    echo -e "${GREEN}All services stopped cleanly.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend Server
echo -e "${YELLOW}[1/2] Launching FastAPI Backend on http://127.0.0.1:8000...${NC}"
export PYTHONPATH="$BACKEND_DIR"
cd "$BACKEND_DIR" || exit 1
"$UVICORN_CMD" app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# Wait briefly for backend
sleep 2

# 2. Start Frontend Server
echo -e "${YELLOW}[2/2] Launching Vite React Frontend on http://127.0.0.1:5173...${NC}"
cd "$FRONTEND_DIR" || exit 1
$NPM_CMD run dev -- --host 127.0.0.1 --port 5173 &
FRONTEND_PID=$!

echo -e "\n${GREEN}==========================================================${NC}"
echo -e "${GREEN} SOC Knowledge Base & Feeds Portal is Ready!${NC}"
echo -e "${GREEN}==========================================================${NC}"
echo -e " -> ${CYAN}Frontend Web UI:${NC}    http://127.0.0.1:5173"
echo -e " -> ${CYAN}Interactive API Docs:${NC} http://127.0.0.1:8000/docs"
echo -e " -> ${CYAN}Live Threat Feeds:${NC}   http://127.0.0.1:8000/api/feeds"
echo -e "${YELLOW}Press [Ctrl + C] anytime to stop all servers.${NC}\n"

# Keep script running to monitor background jobs
wait $BACKEND_PID $FRONTEND_PID

