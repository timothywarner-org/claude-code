# Claude Code AI Agent Instructions

This document provides essential guidance for AI coding agents working in the Claude Code repository. It outlines the architecture, workflows, and conventions to ensure productive contributions.

## Project Overview
Claude Code is a training repository for mastering Claude Code CLI, MCP servers, agentic workflows, and custom skills. It uses:
- **TypeScript/JavaScript**: For CLI tools and agent workflows.
- **Python**: For MCP server implementations.

Key components include:
- **Claude Code CLI**: Terminal-based workflows for code review, refactoring, and automation.
- **MCP Memory Server**: Persistent memory for decisions, entities, and relationships.
- **Custom Skills**: Reusable slash commands for team automation.
- **Agent Workflows**: Multi-step autonomous operations.

## Repository Structure
- `segment_1_quickstart/` - Zero: install, CLI, first CLAUDE.md.
- `segment_2_context/` - Context: the CLAUDE.md hierarchy (user, project, subdirectory scopes).
- `segment_3_agents/` - Agents: the loop, permissions, subagents.
- `segment_4_hero/` - Hero: skills, hooks, and MCP. The Python FastMCP memory server is at `segment_4_hero/memory_server/`.
- `src/`: Supporting Python MCP servers and TypeScript utilities (`utils/`).
- `scripts/`: TypeScript and shell utility scripts for setup, security, and documentation.
- `.mcp.json`: Project-scoped MCP servers the CLI reads on startup (`microsoft-learn`, `oreilly-july20-documentmcp`, `oreilly-july20-memorymcp`, `github`).
- `.claude/`: Skills (`.claude/skills/<name>/SKILL.md`), subagents (`.claude/agents/`), and project settings.

## Development Workflows
### Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Verify environment:
   ```bash
   npm run verify
   ```

### Run
- There is no `npm run build` step in this course. There is no root `tsconfig.json`; demos run via `npx tsx` (JIT compilation).
- Run demo files directly:
  ```bash
  npx tsx <path-to-file.ts>
  ```

### Key Commands

**Segment 2** (Context: The CLAUDE.md Hierarchy) ships no npm scripts. The lesson is markdown and live demos in `segment_2_context/`. The other segments:

```bash
# Segment 1 (Zero: Install, CLI, First CLAUDE.md)
npm run segment1:verify        # Verify API setup
npm run segment1:workflows     # Terminal workflow demos

# Segment 3 (Agents: The Loop, Permissions, Subagents)
npm run segment3:agent-loop    # Agent loop demonstration
npm run segment3:boundaries    # Permission boundaries demo

# Segment 4 (Hero: Skills, Subagents, and MCP)
npm run segment4:workflows     # Production workflow demos
npm run segment4:architecture  # MCP architecture reference
npm run segment4:memory        # Start the optional Python FastMCP memory server
```

## Conventions

- **TypeScript**: Follow strict typing and modular design.
- **Python**: Use FastMCP (managed by UV) for MCP servers.
- **Memory storage**: The Segment 4 memory server persists JSON at `segment_4_hero/memory_server/data/memory.json` (override with `MCP_MEMORY_PATH`).
- **Skills**: Live in `.claude/skills/<name>/SKILL.md`. `.claude/commands/` still works for back-compat but is superseded.
- **Model defaults**: Sonnet 5 (`claude-sonnet-5`, native 1M-token context) is the Claude Code default. Opus 4.8 (`claude-opus-4-8`) for deepest reasoning, Haiku 4.5 (`claude-haiku-4-5-20251001`) for lightweight work.

## Integration Points

- **Anthropic API**: Used for Claude Code CLI and demos.
- **GitHub Workflows**: Automate CI/CD for production workflows.

## Examples

- **Memory Server**: See `segment_4_hero/memory_server/server.py` for resource and tool definitions.
- **Agent Workflows**: Refer to `segment_3_agents/` for agentic loops and boundaries.

For further details, consult `README.md` and `CLAUDE.md`.
