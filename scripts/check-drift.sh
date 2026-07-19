#!/usr/bin/env bash
#
# check-drift.sh - Fail if the course docs drift back to stale facts.
#
# This guards the exact classes of staleness fixed in the 2026-07 grounding pass:
# retired model IDs, the 200K context claim, deprecated MCP config locations,
# the old GitHub Action syntax, deprecated skill paths, and the wrong memory-server
# path. Run it locally before a delivery, or let CI run it on every push.
#
# Usage: bash scripts/check-drift.sh
# Exit 0 = clean. Exit 1 = drift found (prints every offending file:line).
#
# Legitimately-historical mentions (dated changelogs that record what USED to be
# true) are excluded via the HISTORICAL_EXCLUDE filter below.

set -uo pipefail

# Search only course-authored source. Vendored trees and the deck are out of scope.
FILE_GLOBS=(':(glob)**/*.md' ':(glob)**/*.ts' ':(glob)**/*.py' ':(glob)**/*.json')
EXCLUDE_PATHS=(':(exclude)node_modules/**' ':(exclude)**/.venv/**' ':(exclude).github/styles/**')

# Lines matching this are allowed to mention old facts (they are recording history).
HISTORICAL_EXCLUDE='then-current|original.*narration|## Original refresh|names the then-current'

fail=0

# check <label> <regex>
check() {
  local label="$1" regex="$2"
  local hits
  hits="$(git grep -nE "$regex" -- "${FILE_GLOBS[@]}" "${EXCLUDE_PATHS[@]}" 2>/dev/null \
    | grep -vE "$HISTORICAL_EXCLUDE" || true)"
  if [[ -n "$hits" ]]; then
    echo "DRIFT [$label]:"
    echo "$hits" | sed 's/^/  /'
    echo
    fail=1
  fi
}

echo "Running course drift checks..."
echo

check "retired model IDs"          'claude-sonnet-4-6|claude-opus-4-7|Sonnet 4\.6|Opus 4\.7'
check "stale 200K context claim"   '\b200[kK]\b context|context window[^.]{0,40}\b200[kK]\b|\b200[kK]\b[^.]{0,20}context'
check "deprecated GitHub Action"   'claude-code-action@beta'
check "old FastMCP pin"            'fastmcp>=2\.[0-9]'
check "deprecated skill path"      '\.claude/commands/[a-z-]+/scripts/|/project:[a-z]'
check "wrong memory-server path"   'segment_2_context/memory_server'
check "project MCP in settings"    'settings\.json.{0,60}mcpServers|register(ed)?.{0,40}\.claude/settings\.json'

if [[ "$fail" -eq 0 ]]; then
  echo "CLEAN: no drift found. Safe to deliver."
  exit 0
else
  echo "FAILED: drift found above. Fix before delivery (or before merge)."
  exit 1
fi
