# CLAUDE.md - Segment 2: Context

Subdirectory-scope rules for `segment_2_context/`. Loaded when Claude touches anything under this subtree. This file is **also a worked example** - Segment 2 teaches it back to the learner.

## What this segment is

Segment 2 of the O'Reilly "Claude Code and Large-Context Reasoning" course. The topic is **CLAUDE.md at every scope** (user, project, subdirectory) and how `@path/file.md` imports keep big CLAUDE.md files maintainable. The new course arc is **Zero → Context → Agents → Hero**; this is the **Context** beat.

## What belongs here

- The Segment 2 guide: `01_claude_md_at_every_scope.md`
- The demo punchlist this segment links to: `../demos/segment_2_context_punchlist.md`
- This `CLAUDE.md` itself, as a live teaching artifact

## What does NOT belong here

- **No MCP-server-building topics.** MCP moved to `segment_4_hero/` as of 2026-05-25. If you find yourself adding `claude mcp add ...`, server scaffolding, transports, or FastMCP code here, **stop** - that's a Segment 4 edit.
- **No agent-boundaries content.** Tease only; the body lives in `segment_3_agents/`.
- **No new exercises.** Reuse `tests/segment_2_claude_code/exercise_2_code_review.md`.

## History

This directory was `segment_2_mcp/` before the 2026-05-25 refactor. The MCP server material - `02_mcp_architecture.ts`, `MCP_SPEC_CHANGELOG.md`, and `memory_server/` - moved to `segment_4_hero/` along with the rest of the MCP teaching. Nothing MCP-shaped should land here again.

## Voice & style

Follow the repo-root `CLAUDE.md` and `~/.claude/CLAUDE.md`. Tim-voice: bold key terms, no em dashes, no "ask" as a noun, no corporate-speak. First-principles framing. Plain-spoken, mildly irreverent.
