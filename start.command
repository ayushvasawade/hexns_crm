#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if command -v python3 >/dev/null 2>&1; then
    exec python3 scripts/launcher.py start
fi
if command -v python >/dev/null 2>&1; then
    exec python scripts/launcher.py start
fi
printf '%s\n' '[ERROR] Python 3.10+ is required. Install Python and run start.command again.'
exit 1
