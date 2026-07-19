---
name: review-changes
description: Review uncommitted local changes in the current git working tree for bugs, smells, missing tests, and CLAUDE.md voice violations. Use when the user asks to "review my changes", "look at my diff", "check my staged changes", "code review my working tree", or wants a sanity check before committing or opening a PR. Do NOT use for already-open pull requests on GitHub (that's the separate `review` command).
allowed-tools: Read, Glob, Grep, Bash(git:*)
---

# Review uncommitted changes

The current diff, status, and recent history are inlined below. Read them before responding.

## Working tree diff

```!
git diff HEAD
```

## Index + working tree status

```!
git status --short
```

## Last 5 commits (for tone and style reference)

```!
git log -5 --oneline
```

## Your task

Review the changes above. Flag bugs, anti-patterns, missing tests, and any violation of this repo's voice rules. Be terse, be honest, no glazing.

### Hard checks (block-on-find)

1. **No em dashes**. Hyphens with spaces, commas, or periods only.
2. **Never use "ask" as a noun**. "A heavy ask" is a rewrite.
3. **No AWS references**. Not in code, not in comments, not in docs.
4. **No hardcoded secrets**. Flag any string that looks like an API key, token, or password.
5. **No `console.log` in shipped JS/TS**. Test files and demos in `segment_*/` are fine.

### Soft checks (note, don't block)

1. **Comments explain WHY, not WHAT**. Code shows what; comments justify design.
2. **PowerShell-first for shell scripts**. Bash is the fallback.
3. **Azure-first for cloud examples**. Never compare to other clouds.
4. **Docstrings/JSDoc** on every new function or PowerShell script.
5. **Idempotent re-runs** where state mutation is involved.

### Report format

```
## Blockers
- file:line - issue - proposed fix

## Soft findings
- file:line - note

## What's working
- one or two things the diff got right (keep it brief, no glazing)
```

If the diff is empty, say so and stop. Do not invent findings.
