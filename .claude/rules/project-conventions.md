# Project Conventions

Repo-wide conventions that do not fit a single technical rule file. Read the sibling rules for depth: [[python-genai]], [[azure-deployment]], [[secrets-security]], [[testing]].

## What this repo is

A teaching repo for **Claude Code and MCP**, extended with a **Python generative-AI on Azure** track. Most code here is a **teaching artifact**: it will be read aloud, projected, and copied by learners. Hold it to production standard, not toy standard. No `foo`/`bar`/`baz`; use realistic enterprise names and scenarios.

## The `.claude/` layout

| Path | What it holds |
| --- | --- |
| `.claude/rules/` | Project-scoped rules (these files). Standards every contributor follows. |
| `.claude/agents/` | Subagent definitions, one markdown file each with frontmatter. |
| `.claude/skills/` | Skills as `<name>/SKILL.md` plus bundled `resources/`. |
| `.claude/settings.json` | Project-shared Claude Code settings: permissions, hooks, commands. Committed. |
| `.claude/settings.local.json` | Personal overrides. Gitignored. |
| `.mcp.json` (repo root) | Project-scoped MCP servers the CLI reads on startup. |

Project-scoped MCP servers are declared in **`.mcp.json` at the repo root**, not in `settings.json`. The CLI prompts each cloner to approve them once.

## Skills carry resources

A skill is more than a `SKILL.md`. Bundle the **references**, **templates**, and **scripts** it needs under `resources/`, and point at scripts with `${CLAUDE_SKILL_DIR}` so paths resolve under any scope. A skill that inlines everything into one file misses the point of the format.

## Voice and formatting

This repo's prose follows a strict house style. Linters enforce part of it (see `.vale.ini`, `.markdownlint.json`); the rest is on you:

- **Bold key terms.** Readers scan.
- **No em dashes.** Use hyphens with spaces, commas, or periods.
- **Never use "ask" as a noun.** It is a request, a question, or a proposal.
- **No personification of files, services, configs, or processes.** They do not "live", "know", "want", or "see". Use plain verbs: is stored in, reads, matches, runs, stops.
- **No color-only signaling.** Differentiate by shape, label, or position, not by red/green alone.
- Comments explain **why**, not what. The code already shows what.

## Git

- **Trunk-based.** Commit and push to the default branch. Create a branch only for an explicit PR request.
- Conventional commit messages: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`, `perf:`.

## Memory

This repo uses Claude Code's file-based memory. `MEMORY.md` is the index loaded each session; individual facts are one-per-file alongside it. See the annotated `MEMORY.example.md` for the pattern before writing a memory.
