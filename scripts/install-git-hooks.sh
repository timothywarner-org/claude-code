#!/usr/bin/env bash
# Install repo-local git hooks. Intentionally not Husky: this repo has too
# many learners cloning on too many machines for a node-side dependency to be
# reliable. A 30-line shell script is the better teaching artifact.
#
# Usage: npm run hooks:install
#        or: bash scripts/install-git-hooks.sh

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
hooks_dir="$repo_root/.git/hooks"
src_dir="$repo_root/scripts/git-hooks"

if [[ ! -d "$src_dir" ]]; then
  printf 'scripts/git-hooks/ not found at %s\n' "$src_dir" >&2
  exit 1
fi

mkdir -p "$hooks_dir"

for src in "$src_dir"/*; do
  [[ -f "$src" ]] || continue
  name="$(basename "$src")"
  dest="$hooks_dir/$name"
  cp "$src" "$dest"
  chmod +x "$dest"
  printf 'installed: .git/hooks/%s\n' "$name"
done

printf '\nDone. Hooks now run automatically on the matching git events.\n'
