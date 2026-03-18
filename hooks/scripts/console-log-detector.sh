#!/usr/bin/env bash
# ============================================================================
# console-log-detector.sh — PostToolUse Hook
# ============================================================================
# Flags console.log statements after Claude edits JavaScript/TypeScript files.
# Demonstrates how hooks enforce code quality in real time — catching issues
# the moment they're introduced, not during code review.
#
# Hook type:  PostToolUse
# Matcher:    Edit, Write
# Exit code:  Always 0 (warning only, never blocks)
#
# Environment variables provided by Claude Code:
#   TOOL_NAME     — "Edit" or "Write"
#   TOOL_INPUT    — JSON with "file_path" field
# ============================================================================

# Extract file path
FILE_PATH=$(echo "$TOOL_INPUT" | grep -o '"file_path":"[^"]*"' | sed 's/"file_path":"//;s/"$//')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check JS/TS files
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx)
    ;;
  *)
    exit 0
    ;;
esac

# Skip if file doesn't exist
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Count console.log occurrences
LOG_COUNT=$(grep -c "console\.log" "$FILE_PATH" 2>/dev/null || echo "0")

if [ "$LOG_COUNT" -gt 0 ]; then
  echo ""
  echo "⚠️  console.log detected in $(basename "$FILE_PATH") ($LOG_COUNT occurrence(s))"
  echo ""

  # Show the lines with context
  grep -n "console\.log" "$FILE_PATH" | while IFS= read -r line; do
    echo "   $line"
  done

  echo ""
  echo "   💡 Teaching moment: console.log statements are the #1 cause of"
  echo "   accidental data leaks in production. Use a structured logger"
  echo "   (e.g., winston, pino) or remove before committing."
  echo ""
fi

exit 0
