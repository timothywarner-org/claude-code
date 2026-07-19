# CLAUDE.md patterns and common drift modes

Load this reference only when the audit script reports findings. It documents the five canonical CLAUDE.md patterns this repo teaches and the drift modes the audit script catches.

## Pattern 1: project-root CLAUDE.md

**Location**: `CLAUDE.md` at the repo root.

**Purpose**: project-wide conventions. Loaded automatically when Claude Code runs anywhere under the repo.

**Minimal shape**:

```markdown
# Project name

Last revised: YYYY-MM-DD

## Project Overview
One paragraph about what this codebase does.

## Development Commands
The 5-10 commands a new contributor needs.

## Architecture
Top-level layout. One line per major directory.
```

**Common drift modes**:

- **Stale "Last revised" date**. The audit script does not check this, but humans should.
- **Path claims in backticks** pointing to files that have been moved or deleted. The audit script catches these as `broken_path_claim` findings.

## Pattern 2: segment-scoped CLAUDE.md

**Location**: `segment_N_<name>/CLAUDE.md` (one per segment in this course).

**Purpose**: tells Claude what lives in this subtree and which voice rules apply here. Loaded automatically when working inside the segment.

**Minimal shape**:

```markdown
# Segment N - <Name>

## What lives here
- `<file>` - one-line purpose

## Conventions for this directory
- Specific rules that override the project root.

## Voice and style for prose written under this directory
- Bullet list of voice rules.
```

**Common drift modes**:

- **"What lives here" bullets reference files that no longer exist**. The audit script catches these.
- **Voice rules conflict with the root CLAUDE.md**. Subdirectory CLAUDE.md should refine, not contradict.

## Pattern 3: subdirectory-scoped CLAUDE.md

**Location**: any subdirectory where you want different rules than the parent.

**Purpose**: same as segment-scoped, but for arbitrary subtrees (a `frontend/` folder, a `migrations/` folder, etc.).

**The fact that this file exists in this directory and is being read right now is part of the lesson**. That sentence appears verbatim in `segment_4_hero/CLAUDE.md` and is the Segment 2 teaching hook.

**Common drift modes**:

- **Subdirectory CLAUDE.md exists but parent CLAUDE.md never mentions it**. Not a hard error, but learners benefit from the cross-reference.

## Pattern 4: `@path/file.md` imports

**Location**: any CLAUDE.md can pull in another file with `@relative/path/to/file.md`.

**Purpose**: keep CLAUDE.md files focused. Push detail into siblings that get loaded on demand.

**Minimal example**:

```markdown
## Architecture
@docs/architecture.md

## API contract
@docs/api.md
```

**Common drift modes**:

- **The imported file was renamed or deleted**. The audit script catches these by treating any backticked path-like token as a claim.

## Pattern 5: ground-truth facts block

**Location**: `segment_4_hero/CLAUDE.md` has this block. Other CLAUDE.md files may add their own as needed.

**Purpose**: stable, versioned facts that Claude should not re-fetch on every session. Things like protocol versions, model IDs, transport names.

**Minimal example from segment_4_hero**:

```markdown
## Ground-truth facts (do not re-fetch)

- MCP spec **2025-11-25**, transports **stdio** + **Streamable HTTP**. SSE-only is retired.
- Model lineup: **Sonnet 5** (default, native **1M** context) / **Opus 4.8** / **Haiku 4.5**.
```

**Common drift modes**:

- **A new spec version ships and this block was not updated**. The audit script catches this by checking that specific tokens (the version date, transport names, model IDs) appear verbatim.
- **The block was reworded and a token is now spelled differently**. Same finding from the script. Fix: restore the canonical spelling, or update the script's `GROUND_TRUTH_TOKENS` list if the change is intentional.

## How to read audit findings

The audit script emits JSON like this:

```json
{
  "status": "drift",
  "findings": [
    {
      "file": "segment_4_hero/CLAUDE.md",
      "line": 42,
      "severity": "high",
      "category": "ground_truth_drift",
      "message": "Ground-truth token 'Sonnet 5' is missing..."
    }
  ]
}
```

**Severity ladder**:

- **high**: the lesson is now wrong. Fix before recording.
- **medium**: a path claim broke. Fix before merge.
- **low**: voice violation. Fix during normal editing passes.

## How to fix each category

| Category | Fix |
|----------|-----|
| `missing_file` | Restore the file, or remove the CLAUDE.md that references it. |
| `broken_path_claim` | Update the backticked path, or delete the bullet. |
| `ground_truth_drift` | Restore the canonical token, or update `GROUND_TRUTH_TOKENS` in the audit script if the change is intentional and approved. |
| `voice_violation` | Rewrite the line. The `--fix` flag will mechanically swap em dashes for hyphens, but the result usually needs a human pass. |
