# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Last revised: 2026-03-19

## Project Overview

O'Reilly Live Learning course materials for "Claude Code and Large-Context Reasoning" — a 4-hour training focused on Claude Code CLI, MCP servers, agentic workflows, and custom skills. Uses TypeScript/JavaScript with the Anthropic SDK for demos, plus Python with FastMCP (managed by UV) for MCP server implementations.

## Development Commands

```bash
# Install Node dependencies
npm install

# Verify environment setup
npm run verify

# Run any TypeScript demo file
npx tsx <path-to-file.ts>
```

### Course Demo Commands

```bash
# Segment 1: Claude Code Quick Start
npm run segment1:verify      # Verify API setup
npm run segment1:workflows   # Terminal workflow demos

# Segment 2: MCP (Model Context Protocol)
npm run segment2:architecture  # MCP architecture visualization
npm run segment2:memory        # Start memory server (via UV)

# Segment 3: Agents
npm run segment3:agent-loop   # Agent loop demonstration
npm run segment3:boundaries   # Permission boundaries demo

# Segment 4: Skills + Agents
npm run segment4:workflows    # Production workflow demos
```

### MCP Memory Server (Python/UV)

The memory server is a Python FastMCP server managed by UV (not npm/tsx). It launches via `start.sh`, which handles dependency sync (`uv sync`), stale process cleanup, and graceful signal forwarding.

```bash
# Start standalone
cd segment_2_mcp/memory_server
uv run python server.py

# Start via MCP Inspector for debugging
uv run -- fastmcp dev server.py

# Add to Claude Code
claude mcp add memory -- bash segment_2_mcp/memory_server/start.sh

# List MCP servers
claude mcp list
```

The project `.claude/settings.json` registers this server via `bash segment_2_mcp/memory_server/start.sh` (stdio transport, no ports).

### Linting and Formatting

```bash
npx markdownlint-cli2 "**/*.md"  # Markdown linting
vale .                            # Prose linting (requires vale CLI)
npm run lint                      # TypeScript linting (ESLint)
npm run format                    # Format all files (Prettier)
```

## Architecture

### Course Structure

Four segments, each with markdown guides and runnable TypeScript demos:

- `segment_1_quickstart/` — Claude Code CLI installation and basic workflows
- `segment_2_mcp/` — Model Context Protocol servers and memory persistence
- `segment_3_agents/` — Agentic loops, autonomous operations, boundaries
- `segment_4_skills_agents/` — Custom skills and production workflows

### Utility Modules (`src/utils/`)

- `client.ts` — Anthropic client factory with model selection and cost formatting
- `logger.ts` — Colorful console logging for demos

### Additional Python Servers (`src/`)

- `copilot_tips_server.py` — FastMCP server for GitHub Copilot tips CRUD (teaching demo)
- `memory_server.py` — Alternative memory MCP server with DeepSeek-powered optimization
- `api_utils.py` — Python API utilities
- `test_copilot_tips_server.py`, `test_memory_server.py` — Test files for Python servers

### MCP Servers

**Memory Server** (`segment_2_mcp/memory_server/server.py`) — Python FastMCP server demonstrating all three MCP primitives:

- **Tools**: `remember_decision`, `recall_decisions`, `add_convention`, `get_conventions`, `add_note`, `search_notes`, `set_context`, `get_context`, `memory_summary`
- **Resources**: `memory://decisions`, `memory://conventions`, `memory://notes`, `memory://context`
- **Prompts**: `decision_record`, `convention_proposal`, and others
- **Storage**: JSON file at `./data/memory.json` (configurable via `MCP_MEMORY_PATH`)
- **Dependencies**: `pyproject.toml` managed by UV — `fastmcp>=2.0.0`, `pydantic>=2.0.0`
- **Launcher**: `start.sh` — handles `uv sync`, stale process cleanup, signal forwarding

**Hello World MCP Server** (`src/hello-world-mcp-server/server.py`) — Scaffolded FastMCP example with CRUD tools, resources, prompts, and lifespan state management. Good reference for the mcp-scaffold skill output.

### Registered MCP Servers (`.claude/settings.json`)

- `memory` — Local FastMCP memory server via `bash segment_2_mcp/memory_server/start.sh`
- `microsoft-learn` — HTTP MCP server at `https://learn.microsoft.com/api/mcp`

### Hooks (`hooks/`)

Teaching examples of Claude Code hooks. Shell scripts live in `hooks/scripts/`:

- `safety-guard.sh` — PreToolUse: blocks dangerous git/rm commands (exit code 2 = deny)
- `tool-logger.sh` — PostToolUse: logs all tool calls to `.claude/logs/tool-usage.log`
- `auto-format.sh` — PostToolUse: runs Prettier/Ruff on edited files
- `console-log-detector.sh` — PostToolUse: warns about `console.log` in JS/TS edits
- `session-summary.sh` — Stop: prints git status and tool usage stats at session end

Install via merging `hooks/hooks-settings-template.json` into `.claude/settings.json`.

### Automation Scripts (`scripts/`)

TypeScript utility scripts run via `npx tsx scripts/<name>.ts`:

- `verify-setup.ts` — Environment configuration checker
- `check-docs.ts` — Documentation validator
- `claude-review.ts` — Code review automation
- `generate-release-notes.ts` — Release notes generator
- `security-scan.ts` — Security scanning utility

### Custom Skills (`.claude/skills/`)

Skills are in `.claude/skills/`, not `.claude/commands/` (the README references `.claude/commands/` but that directory does not exist):

- `mcp-scaffold/` — Python MCP server scaffolding with FastMCP templates, validation scripts, and reference docs
  - `SKILL.md` — Main workflow with frontmatter
  - `references/` — FASTMCP-GUIDE.md, PATTERNS.md, DEPLOYMENT.md
  - `assets/templates/` — basic-server.py, full-server.py, requirements.txt
  - `scripts/` — scaffold.py, validate.py, init_project.py

### Custom Agents (`.claude/agents/`)

- `code-quality-coach.md` — Mentoring agent using code-review skill
- `release-manager.md` — DevOps agent using deploy-prep skill
- `claude-code-tutor.md` — Teaching agent for Claude Code concepts
- `python-mcp-expert.md` — Expert guide for building Python MCP servers with FastMCP
- `terraform-architect.md` — Terraform IaC expert for Azure/GCP infrastructure

### Key Dependencies

**TypeScript/JavaScript** (package.json):
- `@anthropic-ai/sdk` — Anthropic API client
- `@modelcontextprotocol/sdk` — MCP server/client implementation
- `zod` — Schema validation for MCP tools
- `dotenv` — Environment variable loading
- `express` — HTTP server (for demos)

**Python** (managed per-server via UV + pyproject.toml):
- `fastmcp>=2.0.0` — Pythonic MCP server framework
- `pydantic>=2.0.0` — Data validation and serialization

### Environment Variables

Required: `ANTHROPIC_API_KEY`

Optional:
- `CLAUDE_MODEL` — Model selection (default: `claude-sonnet-4-20250514`)
- `MCP_MEMORY_PATH` — Memory server storage path (default: `./data/memory.json`)
- `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` — For GitHub integration demos (Segments 3 and 4)
- `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` — For Slack integration (Segment 3)

See `.env.example` for full configuration.

## Linting Configuration

- **Vale**: Microsoft, Google, proselint, write-good, alex, Readability, ai-tells styles. Config in `.vale.ini`.
- **markdownlint**: ATX headings, dash list markers, 2-space indent, no line length limit. See `.markdownlint.json`.
- **Prettier**: Single quotes, no trailing commas, 2-space tabs, LF line endings.

## Notable Gaps

- No `tsconfig.json` at project root — `npm run build` (tsc) will fail. TypeScript demos run via `npx tsx` (JIT compilation).
- README references `.claude/commands/` but skills actually live in `.claude/skills/`.
- `segment2:memory` npm script points to a `.ts` file but the primary memory server is the Python/UV version.
