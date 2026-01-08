# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

O'Reilly Live Learning course materials for "Claude Code and Large-Context Reasoning" - a 4-hour training on Claude's 200K context window, MCP servers, and production AI workflows.

## Linting Commands

```bash
# Markdown linting
npx markdownlint-cli2 "**/*.md"

# Prose linting with Vale (requires vale CLI)
vale .

# JavaScript linting (if JS examples added)
npx eslint .

# Format with Prettier
npx prettier --write .
```

## Linting Configuration

- **Vale**: Configured in `.vale.ini` with Microsoft, Google, proselint, write-good, alex, Readability, and ai-tells styles. Styles are in `.github/styles/`.
- **markdownlint**: ATX headings, dash list markers, 2-space indent. Line length rule disabled. See `.markdownlint.json`.
- **Prettier**: Single quotes, no trailing commas, 2-space tabs, LF line endings, 100 char width.
- **ESLint**: Node/Jest environment, strict equality, prefer-const, no-var.

## Repository Structure

```
├── src/          # Course code examples (Python/JavaScript)
├── tests/        # Exercise solutions and tests
├── docs/         # Setup guides, troubleshooting, architecture
├── data/         # Sample datasets for demos
├── scratch/      # Working drafts (not course materials)
└── .github/
    └── styles/   # Vale prose linting rules
```

## Course Content Focus

This course teaches:

- Claude's 200K context window for full-codebase analysis
- Model Context Protocol (MCP) for persistent memory
- Claude Code CLI for terminal-first workflows
- Production integration patterns (CI/CD, GitHub Actions)

Code examples should use JavaScript/Python and demonstrate practical AI-assisted development patterns.
