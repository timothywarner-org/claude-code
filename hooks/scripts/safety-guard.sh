#!/usr/bin/env bash
# PreToolUse hook: deny dangerous Bash commands before they execute.
#
# Why a hook and not just "trust the model": even a careful agent can be
# manipulated by prompt-injected file contents. A deterministic gate is the
# only thing that survives a confused-deputy attack.
#
# Wiring: matcher "Bash" in .claude/settings.json -> PreToolUse.
# Contract: exit 2 = deny (Claude sees the denial and rerouts).
#           exit 0 = allow.
#           Anything on stderr is shown to the model as the denial reason.

set -euo pipefail

payload="$(cat)"

tool="$(printf '%s' "$payload" | jq -r '.tool_name // empty')"
command="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty')"

if [[ "$tool" != "Bash" ]]; then
  exit 0
fi

deny() {
  printf 'safety-guard.sh denied: %s\n' "$1" >&2
  exit 2
}

# Catastrophic filesystem wipes.
if [[ "$command" =~ rm[[:space:]]+(-[a-zA-Z]*[rf][a-zA-Z]*[[:space:]]+)+/ ]]; then
  deny "rm -rf against an absolute root path"
fi

# Force pushes to main or master.
if [[ "$command" =~ git[[:space:]]+push.*--force.*(main|master) ]] \
   || [[ "$command" =~ git[[:space:]]+push.*-f.*(main|master) ]]; then
  deny "force-push to a protected branch (main/master)"
fi

# Hard reset on a published branch.
if [[ "$command" =~ git[[:space:]]+reset[[:space:]]+--hard ]]; then
  deny "git reset --hard (use revert or a soft reset instead)"
fi

# Bypassing hooks or GPG signing without explicit operator consent.
if [[ "$command" =~ --no-verify ]] || [[ "$command" =~ --no-gpg-sign ]]; then
  deny "skipping commit hooks or signatures (--no-verify / --no-gpg-sign)"
fi

# Curl-piped-to-shell, the canonical supply-chain footgun.
if [[ "$command" =~ curl.*\|[[:space:]]*(bash|sh|zsh|pwsh) ]] \
   || [[ "$command" =~ wget.*\|[[:space:]]*(bash|sh|zsh|pwsh) ]]; then
  deny "remote script piped directly to a shell"
fi

exit 0
