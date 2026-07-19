#!/usr/bin/env bash
# SessionEnd hook: write a pending-review marker so the next session can
# offer to update memory and CLAUDE.md based on what just happened.
#
# Why: auto-writing memory unattended produces drift. This script captures
# the session-end signal cheaply (no API calls, no background process) and
# defers the actual memory work to the next interactive session, where
# Tim can sign off on each proposed edit.
#
# Pairs with: session-start-memory-prompt.sh (SessionStart hook).
#
# Wiring: .claude/settings.json -> hooks.SessionEnd
# Contract: exit 0 always. Must not block session termination.

set -euo pipefail

cat >/dev/null || true

project_dir="${CLAUDE_PROJECT_DIR:-$PWD}"
state_dir="$project_dir/.claude/state"
log_file="$project_dir/.claude/logs/session-memory-update.log"
marker_file="$state_dir/pending-memory-review.json"

mkdir -p "$state_dir" "$(dirname "$log_file")"

timestamp="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
session_id="${CLAUDE_SESSION_ID:-unknown}"

# Try to capture the transcript path. Claude Code exposes this via env vars
# in newer versions; fall back to a best-effort search if absent.
transcript_path="${CLAUDE_TRANSCRIPT_PATH:-}"
if [[ -z "$transcript_path" ]]; then
  transcript_path="(unknown, check ~/.claude/projects/ for session $session_id)"
fi

cat > "$marker_file" <<EOF
{
  "ended_at": "$timestamp",
  "session_id": "$session_id",
  "transcript_path": "$transcript_path",
  "reviewed": false
}
EOF

printf '[%s] SessionEnd marker written: session=%s transcript=%s\n' \
  "$timestamp" "$session_id" "$transcript_path" >> "$log_file"

exit 0
