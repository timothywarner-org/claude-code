---
name: claude-md-audit
description: Audit the CLAUDE.md hierarchy in a repo for drift between what each CLAUDE.md claims and what's actually on disk. Validates that referenced file paths still exist, flags voice violations (em dashes, "ask" as a noun), and checks the ground-truth facts block for stale tokens (MCP spec date, transports, model lineup). Use when the user asks to audit, validate, check, or verify CLAUDE.md files, says "is my CLAUDE.md still accurate", flags possible doc drift, or wants to sanity-check the docs before a course recording or release.
allowed-tools: Read, Glob, Grep, Bash(python:*)
argument-hint: "[--fix] [--scope=root|segment_1|segment_2|segment_3|segment_4|all]"
---

# CLAUDE.md hierarchy audit

This skill validates the five-scope CLAUDE.md teaching artifact that Segment 2 of this course centers on. The Python audit script does the heavy lifting; this prompt orchestrates and interprets.

## Run the audit

```!
python "${CLAUDE_SKILL_DIR}/scripts/audit_claude_md.py" $ARGUMENTS
```

## How to interpret results

The script outputs JSON. Read the `status` field first:

- **`clean`** (exit 0): every CLAUDE.md file exists, every referenced path resolves, ground-truth facts block matches expected values. Report a one-line "all clean" and stop.
- **`drift`** (exit 1): one or more findings. Read each entry in the `findings` array. Each has `file`, `severity` (`high`/`medium`/`low`), `category`, and `message`.
- **`error`** (exit 2): hard failure (missing repo root, script bug). Report the error and stop.

## When drift is found

1. **Load `references/CLAUDE_MD_PATTERNS.md`** — it documents the five canonical patterns and the common drift modes. Read it only when needed (progressive disclosure).
2. **Group findings by severity**. Address `high` first.
3. **For each finding**, propose the minimal correction. Cite the file and line.
4. **If the user passed `--fix`**, the script already corrected obvious path typos. Re-run without `--fix` to confirm.

## Voice rules for any rewrites you propose

This is a Tim Warner course repo. Match the voice in `segment_4_hero/CLAUDE.md`:

- **Bold** key terms.
- No em dashes. Hyphens with spaces, commas, or periods only.
- Never use "ask" as a noun.
- Sentence-case headings.
- First-principles, plain-spoken, mildly irreverent. No corporate-speak.

## What the script does NOT check

- Whether the lesson prose in each CLAUDE.md is pedagogically sound. That's a human judgment.
- Whether new files added to the repo should be mentioned in a CLAUDE.md. Suggest additions only when the diff is obvious.
