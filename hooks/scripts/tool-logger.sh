#!/usr/bin/env bash
# ============================================================================
# tool-logger.sh — PostToolUse Hook
# ============================================================================
# Logs every tool call Claude makes to a local audit file. Great for learning
# what Claude does "under the hood" during a session.
#
# Hook type:  PostToolUse
# Matcher:    (none — matches all tools)
# Exit code:  Always 0 (never blocks)
#
# Environment variables provided by Claude Code:
#   TOOL_NAME     — The tool that was just used (Read, Write, Bash, etc.)
#   TOOL_INPUT    — JSON string of the tool's parameters
#   TOOL_OUTPUT   — JSON string of the tool's result (PostToolUse only)
#   SESSION_ID    — Current session identifier
# ============================================================================

LOG_DIR="${CLAUDE_TOOL_LOG_DIR:-.claude/logs}"
LOG_FILE="$LOG_DIR/tool-usage.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Parse key details from tool input (keep it short for readability)
case "$TOOL_NAME" in
  Read)
    DETAIL=$(echo "$TOOL_INPUT" | grep -o '"file_path":"[^"]*"' | head -1)
    ;;
  Write|Edit)
    DETAIL=$(echo "$TOOL_INPUT" | grep -o '"file_path":"[^"]*"' | head -1)
    ;;
  Bash)
    DETAIL=$(echo "$TOOL_INPUT" | grep -o '"command":"[^"]*"' | head -1 | cut -c1-120)
    ;;
  Glob)
    DETAIL=$(echo "$TOOL_INPUT" | grep -o '"pattern":"[^"]*"' | head -1)
    ;;
  Grep)
    DETAIL=$(echo "$TOOL_INPUT" | grep -o '"pattern":"[^"]*"' | head -1)
    ;;
  *)
    DETAIL="(no detail extracted)"
    ;;
esac

echo "[$TIMESTAMP] $TOOL_NAME — $DETAIL" >> "$LOG_FILE"

# Print a subtle reminder so learners see it in the terminal
echo "📝 Logged: $TOOL_NAME → $LOG_FILE"

exit 0
