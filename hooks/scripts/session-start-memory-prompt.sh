#!/usr/bin/env bash
# SessionStart hook: if a pending memory-review marker exists from a prior
# session, surface it to Claude as additionalContext so the assistant can
# offer to update memory and CLAUDE.md interactively.
#
# Why: Option B of the two-layer design. The SessionEnd hook drops a cheap
# marker; this hook reads it and injects a system reminder so the next
# session does the review WITH Tim, not behind his back.
#
# Wiring: .claude/settings.json -> hooks.SessionStart
# Contract: exit 0 always. Output JSON with hookSpecificOutput.additionalContext
# to inject text into the model's context for this session.

set -euo pipefail

cat >/dev/null || true

project_dir="${CLAUDE_PROJECT_DIR:-$PWD}"
state_dir="$project_dir/.claude/state"
log_file="$project_dir/.claude/logs/session-memory-update.log"
marker_file="$state_dir/pending-memory-review.json"

if [[ ! -f "$marker_file" ]]; then
  # No pending review. Exit silently.
  exit 0
fi

# Read the marker without requiring jq (Windows users may not have it).
# Cheap grep parse since we wrote the JSON ourselves.
ended_at="$(grep -oP '"ended_at"\s*:\s*"\K[^"]+' "$marker_file" 2>/dev/null || echo 'unknown')"
session_id="$(grep -oP '"session_id"\s*:\s*"\K[^"]+' "$marker_file" 2>/dev/null || echo 'unknown')"

timestamp="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
printf '[%s] SessionStart found pending review from %s (session=%s)\n' \
  "$timestamp" "$ended_at" "$session_id" >> "$log_file"

# Emit JSON to inject context. Claude Code reads this on SessionStart hooks.
# The additionalContext text becomes a system reminder visible to the model
# at the start of the new session.
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "PENDING MEMORY REVIEW: The previous session in this project ended at $ended_at (session id: $session_id). Before starting new work, briefly offer Tim a memory-update pass: scan recent conversation for facts that match the auto-memory criteria (user, feedback, project, reference types from his global CLAUDE.md), propose updates to C:/Users/timot/.claude/projects/C--github-claude-code/memory/ and to C:/github/claude-code/CLAUDE.md if any stable convention emerged, and wait for his sign-off on each edit. If nothing memory-worthy happened, say so and move on. After the review (or skip), delete the marker at .claude/state/pending-memory-review.json so it does not re-fire."
  }
}
EOF

exit 0
