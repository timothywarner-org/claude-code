#!/usr/bin/env bash
# PostToolUse hook: format files immediately after Claude edits them.
#
# Why: keeps the working tree consistent without a separate "now run prettier"
# step. Formatting is non-semantic, idempotent, and safe to re-run.
#
# Wiring: matcher "Edit|Write|MultiEdit" in .claude/settings.json -> PostToolUse.
# Contract: exit 0 always. Formatter failures are logged but never block.

set -euo pipefail

payload="$(cat)"

file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')"

if [[ -z "$file_path" || ! -f "$file_path" ]]; then
  exit 0
fi

format_with() {
  local cmd="$1"
  shift
  if command -v "$cmd" >/dev/null 2>&1; then
    "$cmd" "$@" "$file_path" >/dev/null 2>&1 || true
  fi
}

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.md)
    format_with npx prettier --write
    ;;
  *.py)
    format_with ruff format
    ;;
  *.ps1|*.psm1)
    if command -v pwsh >/dev/null 2>&1; then
      pwsh -NoProfile -Command "Invoke-Formatter -ScriptDefinition (Get-Content -Raw '$file_path') | Set-Content '$file_path'" >/dev/null 2>&1 || true
    fi
    ;;
esac

exit 0
