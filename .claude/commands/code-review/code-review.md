---
name: code-review
description: Comprehensive code review with security scanning, performance analysis, and style checking. Use when reviewing PRs, staged changes, or specific files.
allowed-tools: Read, Glob, Grep, Bash(git:*, npm:test, npm:lint, python:*)
argument-hint: "[branch|file|--staged]"
---

# Code Review Workflow

Perform a comprehensive code review on the specified target.

## Arguments

- `$ARGUMENTS` can be:
  - A branch name (e.g., `feature/auth`) - reviews diff against main
  - A file path (e.g., `src/api.ts`) - reviews specific file
  - `--staged` - reviews staged changes only
  - Empty - reviews current branch against main

## Review Process

### Step 1: Gather Changes

```bash
# If branch specified
git diff main...$1

# If --staged
git diff --cached

# If file specified
git diff main -- $1

# Default: current branch
git diff main...HEAD
```

### Step 2: Run Automated Checks

Execute the security scanner:
```bash
python .claude/commands/code-review/scripts/security_scan.py
```

Check for common issues:
```bash
python .claude/commands/code-review/scripts/lint_check.py
```

### Step 3: Manual Analysis

For each changed file, analyze:

1. **Security** (Critical)
   - SQL injection vulnerabilities
   - XSS attack vectors
   - Authentication/authorization issues
   - Hardcoded secrets or credentials
   - See [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) for full list

2. **Performance** (Warning)
   - N+1 query patterns
   - Unnecessary loops or iterations
   - Missing indexes on database queries
   - Large payload sizes
   - See [PERFORMANCE_GUIDE.md](PERFORMANCE_GUIDE.md) for patterns

3. **Code Quality** (Suggestion)
   - Consistent naming conventions
   - Proper TypeScript types
   - Missing error handling
   - Code duplication

### Step 4: Generate Report

Output a structured review in this format:

```json
{
  "approved": boolean,
  "summary": "Brief description of changes",
  "issues": [
    {
      "severity": "critical|warning|suggestion",
      "category": "security|performance|quality",
      "file": "path/to/file.ts",
      "line": 42,
      "message": "Description of issue",
      "suggestion": "How to fix it"
    }
  ],
  "stats": {
    "files_reviewed": number,
    "lines_added": number,
    "lines_removed": number,
    "issues_found": number
  }
}
```

## Severity Guidelines

| Severity | Action | Examples |
|----------|--------|----------|
| **Critical** | Block merge | SQL injection, auth bypass, secrets in code |
| **Warning** | Request changes | Missing validation, performance issues |
| **Suggestion** | Optional | Style improvements, refactoring ideas |

## Integration

This skill integrates with:
- Git hooks (pre-commit, pre-push)
- GitHub Actions (see `.github/workflows/`)
- CI/CD pipelines
