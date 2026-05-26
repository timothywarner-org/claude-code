#!/usr/bin/env bash
# PostToolUse hook: warn (not block) when console.log lands in JS/TS source.
#
# Why: debug prints are easy to write, easy to forget, and embarrassing in a
# committed PR. A non-blocking nudge catches them at the moment of creation.
#
# Wiring: matcher "Edit|Write|MultiEdit" in .claude/settings.json -> PostToolUse.
# Contract: exit 0 always. Detection writes a warning to stderr, which Claude
#           sees in the next turn and can act on (or you see in the transcript).

set -euo pipefail

payload="$(cat)"

file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')"

if [[ -z "$file_path" || ! -f "$file_path" ]]; then
  exit 0
fi

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) ;;
  *) exit 0 ;;
esac

if grep -nE '^[[:space:]]*console\.(log|debug|info)\b' "$file_path" >/dev/null 2>&1; then
  printf 'console-log-detector: %s still contains console.log/debug/info — strip before commit.\n' "$file_path" >&2
fi

exit 0
