#!/usr/bin/env bash
# ============================================================================
# session-summary.sh — Stop Hook
# ============================================================================
# Runs when a Claude Code session ends. Produces a quick summary of files
# changed during the session — helping learners see the full picture of
# what an agentic session accomplished.
#
# Hook type:  Stop
# Matcher:    (none — runs on session end)
# Exit code:  Always 0
#
# This hook reads from the tool-logger's output if available, and also
# checks git for uncommitted changes.
# ============================================================================

echo ""
echo "┌──────────────────────────────────────────────┐"
echo "│         📊 Session Summary                   │"
echo "└──────────────────────────────────────────────┘"
echo ""

# ── Show git status ────────────────────────────────────────────────────────
if command -v git &> /dev/null && git rev-parse --is-inside-work-tree &> /dev/null; then
  MODIFIED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
  STAGED=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
  UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')

  echo "  Git Changes:"
  echo "    Modified:  $MODIFIED file(s)"
  echo "    Staged:    $STAGED file(s)"
  echo "    Untracked: $UNTRACKED file(s)"
  echo ""

  # List modified files
  if [ "$MODIFIED" -gt 0 ]; then
    echo "  Modified files:"
    git diff --name-only 2>/dev/null | while IFS= read -r file; do
      echo "    • $file"
    done
    echo ""
  fi

  # List untracked files
  if [ "$UNTRACKED" -gt 0 ]; then
    echo "  New files:"
    git ls-files --others --exclude-standard 2>/dev/null | while IFS= read -r file; do
      echo "    + $file"
    done
    echo ""
  fi
fi

# ── Show tool log stats if available ──────────────────────────────────────
LOG_DIR="${CLAUDE_TOOL_LOG_DIR:-.claude/logs}"
LOG_FILE="$LOG_DIR/tool-usage.log"

if [ -f "$LOG_FILE" ]; then
  TOTAL_CALLS=$(wc -l < "$LOG_FILE" | tr -d ' ')
  echo "  Tool Usage (this session):"
  echo "    Total tool calls: $TOTAL_CALLS"

  # Count by tool type
  echo "    Breakdown:"
  sort "$LOG_FILE" | grep -oP '(?<=\] )\w+' | sort | uniq -c | sort -rn | while IFS= read -r line; do
    echo "      $line"
  done
  echo ""
fi

# ── Reminder ──────────────────────────────────────────────────────────────
echo "  💡 Tip: Review changes with 'git diff' before committing."
echo "     The tool log is at: $LOG_FILE"
echo ""

exit 0
