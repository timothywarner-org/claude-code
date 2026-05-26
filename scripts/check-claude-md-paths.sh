#!/usr/bin/env bash
# Pre-commit check: every backtick-quoted path inside any CLAUDE.md must exist.
#
# Why: this repo has been burned by aspirational CLAUDE.md claims (the original
# hooks/ block referenced five scripts that never shipped). A confident wrong
# answer in the project memory file is worse than no answer at all, because
# Claude will load it and act on it.
#
# Contract: exit 0 if every referenced path resolves, exit 1 otherwise.
#           Prints a punch list of missing paths so the operator can fix them.

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

missing=0

# Find every CLAUDE.md tracked by git.
mapfile -t claude_files < <(git ls-files '**/CLAUDE.md' 'CLAUDE.md' 2>/dev/null | sort -u)

if [[ ${#claude_files[@]} -eq 0 ]]; then
  exit 0
fi

for md in "${claude_files[@]}"; do
  md_dir="$(dirname "$md")"

  # Grep backtick-quoted tokens. Filter to ones that look like paths (have a
  # slash or a recognized extension). This is intentionally conservative — we
  # would rather miss a real path than nag about ``foo`` identifiers.
  mapfile -t tokens < <(
    grep -oE '`[^`]+`' "$md" \
      | sed -E 's/^`//; s/`$//' \
      | grep -E '(/|\.(ts|tsx|js|jsx|json|md|sh|ps1|py|yml|yaml|toml|env))' \
      | grep -vE '^(https?|git@|npm|npx|uv|bash|pwsh|claude|node|python)' \
      | sort -u || true
  )

  for token in "${tokens[@]}"; do
    # Skip glob patterns, URL fragments, and shell expressions.
    case "$token" in
      *'*'*|*'$'*|*' '*|*'#'*) continue ;;
    esac

    # Resolve relative to the CLAUDE.md directory, then to repo root.
    if [[ -e "$md_dir/$token" || -e "$repo_root/$token" || -e "$token" ]]; then
      continue
    fi

    printf '%s references missing path: %s\n' "$md" "$token"
    missing=$((missing + 1))
  done
done

if [[ $missing -gt 0 ]]; then
  printf '\n%d missing path reference(s). Update the CLAUDE.md or ship the file.\n' "$missing" >&2
  exit 1
fi

exit 0
