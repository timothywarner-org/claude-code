#!/usr/bin/env bash
# ============================================================================
# safety-guard.sh — PreToolUse Hook
# ============================================================================
# Intercepts potentially destructive commands BEFORE they run. Demonstrates
# how hooks act as guardrails — the first line of defense in agentic systems.
#
# Hook type:  PreToolUse
# Matcher:    Bash
# Exit code:  0 = allow, 2 = block (with reason on stderr)
#
# Environment variables provided by Claude Code:
#   TOOL_NAME     — Always "Bash" (because of the matcher)
#   TOOL_INPUT    — JSON string containing the "command" field
# ============================================================================

# Extract the command from the JSON input
COMMAND=$(echo "$TOOL_INPUT" | grep -o '"command":"[^"]*"' | sed 's/"command":"//;s/"$//')

# ── Pattern 1: Destructive git operations ──────────────────────────────────
DESTRUCTIVE_GIT_PATTERNS=(
  "git push --force"
  "git push -f "
  "git reset --hard"
  "git clean -fd"
  "git checkout -- ."
  "git branch -D"
)

for pattern in "${DESTRUCTIVE_GIT_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qi "$pattern"; then
    echo "🛑 BLOCKED: Destructive git operation detected" >&2
    echo "   Command: $COMMAND" >&2
    echo "   Pattern: $pattern" >&2
    echo "" >&2
    echo "   💡 Teaching moment: In production agentic systems, hooks like" >&2
    echo "   this prevent AI agents from running dangerous commands without" >&2
    echo "   explicit human approval." >&2
    exit 2
  fi
done

# ── Pattern 2: Dangerous file system operations ───────────────────────────
if echo "$COMMAND" | grep -qE "rm\s+-rf\s+(/|~|\.\.)"; then
  echo "🛑 BLOCKED: Dangerous recursive delete targeting root, home, or parent" >&2
  echo "   Command: $COMMAND" >&2
  exit 2
fi

# ── Pattern 3: Warn (but allow) on broad file operations ─────────────────
if echo "$COMMAND" | grep -qE "rm\s+-rf\s"; then
  echo "⚠️  WARNING: Recursive delete detected — proceeding with caution" >&2
  echo "   Command: $COMMAND" >&2
  # Exit 0 = allow, but the warning appears in the terminal
fi

# ── Pattern 4: Prevent accidental secret exposure ─────────────────────────
if echo "$COMMAND" | grep -qiE "(cat|echo|printf).*\.(env|pem|key)"; then
  echo "🛑 BLOCKED: Potential secret exposure" >&2
  echo "   Command: $COMMAND" >&2
  echo "   💡 Never cat/echo files that may contain secrets." >&2
  exit 2
fi

exit 0
