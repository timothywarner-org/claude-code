#!/usr/bin/env bash
# ============================================================================
# auto-format.sh — PostToolUse Hook
# ============================================================================
# Automatically formats files after Claude edits them. Shows how hooks
# enforce team standards without relying on the AI to remember.
#
# Hook type:  PostToolUse
# Matcher:    Edit, Write
# Exit code:  Always 0 (formatting failures shouldn't block work)
#
# Environment variables provided by Claude Code:
#   TOOL_NAME     — "Edit" or "Write"
#   TOOL_INPUT    — JSON with "file_path" field
# ============================================================================

# Extract file path from input
FILE_PATH=$(echo "$TOOL_INPUT" | grep -o '"file_path":"[^"]*"' | sed 's/"file_path":"//;s/"$//')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only format if the file exists (Write might create new files)
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Determine file type and apply appropriate formatter
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.md)
    # Check if prettier is available
    if command -v npx &> /dev/null && [ -f "node_modules/.bin/prettier" ]; then
      npx prettier --write "$FILE_PATH" 2>/dev/null
      if [ $? -eq 0 ]; then
        echo "✨ Auto-formatted: $(basename "$FILE_PATH")"
      fi
    else
      echo "💡 Tip: Install prettier for automatic formatting (npm i -D prettier)"
    fi
    ;;
  *.py)
    # Check if black or ruff is available
    if command -v ruff &> /dev/null; then
      ruff format "$FILE_PATH" 2>/dev/null
      echo "✨ Auto-formatted (ruff): $(basename "$FILE_PATH")"
    elif command -v black &> /dev/null; then
      black --quiet "$FILE_PATH" 2>/dev/null
      echo "✨ Auto-formatted (black): $(basename "$FILE_PATH")"
    fi
    ;;
esac

exit 0
