#!/usr/bin/env bash
#
# predeliver.sh - The morning-of-delivery ritual. One command to confirm the
# course is safe to teach.
#
# Blocking check (fails the script):
#   - drift gate: retired model IDs, 200K claims, stale MCP/skill/action facts.
#
# Informational checks (printed, never block - they carry known false positives
# like the runtime-created data/memory.json path and em-dash list separators):
#   - CLAUDE.md hierarchy audit
#   - CLAUDE.md backticked-path existence
#
# Usage: npm run predeliver   (or: bash scripts/predeliver.sh)

set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "=============================================="
echo " Pre-delivery checks"
echo "=============================================="
echo

echo ">> [BLOCKING] Drift gate"
if bash scripts/check-drift.sh; then
  drift_ok=1
else
  drift_ok=0
fi
echo

echo ">> [info] CLAUDE.md hierarchy audit (non-blocking)"
python .claude/skills/claude-md-audit/scripts/audit_claude_md.py --scope all 2>/dev/null \
  | python -c "import sys,json
try: d=json.load(sys.stdin)
except Exception: print('   (audit produced no JSON)'); sys.exit(0)
fs=d.get('findings',[])
from collections import Counter
by=Counter(f['severity'] for f in fs)
print(f\"   status: {d.get('status','?')} - {by.get('medium',0)} medium, {by.get('low',0)} low\")
meds=[f for f in fs if f.get('severity')=='medium']
if meds:
    print('   medium findings (often false positives: runtime-created paths, no-tsconfig notes):')
    for f in meds: print(f\"     {f['file']}:{f.get('line','?')} {f['message']}\")
" || true
echo

echo ">> [info] Reminder - verify by hand before you record:"
echo "   - Model lineup at code.claude.com/docs (lineups move fast)"
echo "   - Carried-over pricing in src/utils/client.ts and"
echo "     tests/segment_4_production/exercise_2_cost_calculator.ts (search: verify current pricing)"
echo

echo "=============================================="
if [[ "$drift_ok" -eq 1 ]]; then
  echo " RESULT: drift gate CLEAN. Safe to deliver."
  echo "=============================================="
  exit 0
else
  echo " RESULT: DRIFT FOUND (see above). Fix before delivery."
  echo "=============================================="
  exit 1
fi
