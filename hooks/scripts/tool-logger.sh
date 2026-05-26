#!/usr/bin/env bash
# PostToolUse hook: append a one-line audit record for every tool call.
#
# Why: when a demo goes sideways live on stage, a chronological tool log is
# faster to read than scrolling the transcript. Also a useful artifact for
# learners who want to see exactly what Claude did.
#
# Wiring: matcher "*" in .claude/settings.json -> PostToolUse.
# Contract: exit 0 always. This hook observes; it never blocks.

set -euo pipefail

payload="$(cat)"

log_dir="${CLAUDE_PROJECT_DIR:-.}/.claude/logs"
mkdir -p "$log_dir"
log_file="$log_dir/tool-usage.log"

ts="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
tool="$(printf '%s' "$payload" | jq -r '.tool_name // "unknown"')"
session="$(printf '%s' "$payload" | jq -r '.session_id // "no-session"')"
summary="$(printf '%s' "$payload" | jq -c '.tool_input // {}' | cut -c1-200)"

printf '%s  session=%s  tool=%s  input=%s\n' \
  "$ts" "$session" "$tool" "$summary" >> "$log_file"

exit 0
