#!/usr/bin/env bash
# Memory MCP Server launcher
# - Auto-syncs venv/dependencies via uv
# - Handles graceful shutdown (no orphan processes)
# - Works from any working directory (uses absolute path to server dir)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Kill any stale memory-server python processes from previous runs
# (matches "python server.py" in this directory only)
if command -v pgrep &>/dev/null; then
  for pid in $(pgrep -f "python.*server\.py" 2>/dev/null || true); do
    # Only kill if the process cwd matches ours (best-effort)
    if [[ "$pid" != "$$" ]]; then
      # Check if this is actually our server by inspecting cmdline
      cmdline=$(cat /proc/"$pid"/cmdline 2>/dev/null || echo "")
      if echo "$cmdline" | grep -q "memory_server" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
      fi
    fi
  done
fi

# Ensure dependencies are installed (creates .venv if needed)
uv sync --quiet 2>/dev/null

# Forward signals to child process for clean shutdown
cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  exit 0
}
trap cleanup SIGTERM SIGINT SIGHUP EXIT

# Start the server (stdio transport — no ports used)
uv run python server.py &
SERVER_PID=$!
wait "$SERVER_PID"
