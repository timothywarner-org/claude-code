#!/usr/bin/env bash
# Stop hook: print a short end-of-session retro to stdout.
#
# Why: scrum-team habit. Every session ends with "what shipped, what didn't,
# what carries into the next sprint." This script is the cheap version of that
# ritual.
#
# Wiring: no matcher needed in .claude/settings.json -> Stop.
# Contract: exit 0 always. Output goes to the transcript, not back to Claude.

set -euo pipefail

# Drain stdin so the harness doesn't see a broken pipe on small payloads.
cat >/dev/null || true

project_dir="${CLAUDE_PROJECT_DIR:-$PWD}"
log_file="$project_dir/.claude/logs/tool-usage.log"

printf '\n=== session summary ===\n'

if command -v git >/dev/null 2>&1 && git -C "$project_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  changed="$(git -C "$project_dir" status --porcelain | wc -l | tr -d ' ')"
  branch="$(git -C "$project_dir" rev-parse --abbrev-ref HEAD)"
  printf 'branch:   %s\n' "$branch"
  printf 'changes:  %s file(s) dirty\n' "$changed"
fi

if [[ -f "$log_file" ]]; then
  total="$(wc -l < "$log_file" | tr -d ' ')"
  printf 'tool log: %s entries at %s\n' "$total" "$log_file"
  printf 'top tools this session:\n'
  awk '{ for (i=1;i<=NF;i++) if ($i ~ /^tool=/) print substr($i,6) }' "$log_file" \
    | sort | uniq -c | sort -rn | head -5 \
    | awk '{ printf "  %4d  %s\n", $1, $2 }'
fi

printf '=======================\n'

exit 0
