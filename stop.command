#!/usr/bin/env bash
# ==============================================================================
# HEXNS CRM - Graceful Shutdown System (macOS)
# ==============================================================================

cd "$(cd "$(dirname "$0")" && pwd)" || exit 1

VENV_PY="backend/.venv/bin/python"

if [ -f "$VENV_PY" ]; then
    $VENV_PY scripts/launcher.py stop
elif command -v python3 >/dev/null 2>&1; then
    python3 scripts/launcher.py stop
else
    echo "[INFO] Python not found. Performing fallback process cleanup..."
    if [ -f ".run/frontend.pid" ]; then
        PID=$(tr -d ' \r\n' < .run/frontend.pid)
        kill "$PID" 2>/dev/null || true
        rm -f .run/frontend.pid
        echo "[STOP] Frontend stopped (PID: $PID)."
    fi
    if [ -f ".run/backend.pid" ]; then
        PID=$(tr -d ' \r\n' < .run/backend.pid)
        kill "$PID" 2>/dev/null || true
        rm -f .run/backend.pid
        echo "[STOP] Backend stopped (PID: $PID)."
    fi
fi

read -r -p "Press Enter to close this window..." || true

