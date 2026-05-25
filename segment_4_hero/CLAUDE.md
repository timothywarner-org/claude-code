# Segment 4 — Hero (Skills, Subagents, MCP Consumption)

This file is per-segment context for Claude Code. It tells Claude what lives in this directory and how to think about it. **The fact that this file exists, in this directory, and is being read right now, is part of the lesson** — that is exactly the subdirectory-scoped CLAUDE.md pattern Segment 2 introduced.

## What lives here

- `01_skills_intro.md` — Skills, slash commands, dynamic context injection
- `04_mcp_consumption.md` — MCP as **reach** when CLAUDE.md hierarchy is not enough
- `02_production_workflows.ts` — Production multi-skill workflow demo (TypeScript)
- `MCP_SPEC_CHANGELOG.md` — Spec-version reference for advanced learners

Demo punchlist for live walkthrough: `demos/segment_4_hero_punchlist.md`.
Hands-on exercises: `tests/segment_4_production/`.

## Conventions for this directory

- **Skills live in `.claude/skills/`**, not `.claude/commands/`. Legacy `.claude/commands/` still works for back-compat, but every new skill ships as `.claude/skills/<name>/SKILL.md`.
- **Subagents live in `.claude/agents/`** as single markdown files with frontmatter. Existing examples to reference: `code-quality-coach.md`, `python-mcp-expert.md`, `claude-code-tutor.md`.
- **MCP is consumed, not authored** in this segment. The `microsoft-learn` HTTP server registered in `.claude/settings.json` is the canonical demo target. Do **not** write a new MCP server in this segment unless the learner specifically opts in to the optional homework — point them at `segment_4_hero/memory_server/` (existing Python FastMCP server) for that.
- **`segment_4_hero/memory_server/` is the optional build-your-own MCP asset.** Moved here from the old `segment_2_mcp/` on 2026-05-25. Do not delete it. The `02_mcp_architecture.ts` and `MCP_SPEC_CHANGELOG.md` in this directory came along for the same reason.

## Voice and style for prose written under this directory

- Bold key terms.
- No em dashes. Hyphens with spaces, commas, or periods.
- Never use "ask" as a noun.
- Senior-engineer plain-spoken. First-principles. Mildly irreverent.
- Three-superpower framing for skills: **arguments**, **dynamic context injection**, **forked context**.
- Three-primitive framing for MCP: **tools** (model-controlled), **resources** (app-controlled), **prompts** (user-controlled).

## Ground-truth facts (do not re-fetch)

- MCP spec **2025-11-25**, transports **stdio** + **Streamable HTTP**. SSE-only is retired.
- Skills frontmatter: `description`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `effort`, `context: fork`, `agent`, `paths`, `argument-hint`, `arguments`, `hooks`, `shell`.
- Dynamic context injection: `` !`<bash>` `` at line start or after whitespace; multi-line via ` ```! ` fenced block.
- `${CLAUDE_SKILL_DIR}` for portable script paths under any scope.
- Model lineup: **Opus 4.7** / **Sonnet 4.6** (default) / **Haiku 4.5**.
