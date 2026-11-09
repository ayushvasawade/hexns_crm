#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if [ -x "backend/.venv/bin/python" ]; then
    exec backend/.venv/bin/python scripts/launcher.py stop
fi
if command -v python3 >/dev/null 2>&1; then
    exec python3 scripts/launcher.py stop
fi
if command -v python >/dev/null 2>&1; then
    exec python scripts/launcher.py stop
fi
printf '%s\n' '[ERROR] Python is required to safely read CRM process ownership records.'
exit 1
