# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Last revised: 2026-07-18

## How this repo teaches CLAUDE.md

This repo is the worked example for Segment 2 of the course. Five CLAUDE.md files at different scopes show the hierarchy in practice:

- `CLAUDE.md` (this file, repo root) — project-wide conventions
- `segment_1_quickstart/CLAUDE.md` — minimal demo conventions
- `segment_2_context/CLAUDE.md` — context-engineering rules
- `segment_3_agents/CLAUDE.md` — boundary spec (what Claude may and may not do)
- `segment_4_hero/CLAUDE.md` — skills/agents/MCP directory conventions

Open all five side-by-side. Each one is loaded automatically by Claude Code when working inside that subtree. See `segment_2_context/01_claude_md_at_every_scope.md` for the full lesson.

## Project Overview

O'Reilly Live Learning course materials for "Claude Code and Large-Context Reasoning," a 4-hour training. The course arc is **Zero -> Context -> Agents -> Hero**: install Claude Code, master CLAUDE.md at every scope, run autonomous agents with boundaries, then layer on skills, subagents, and MCP. Uses TypeScript/JavaScript with the Anthropic SDK for demos, plus Python with FastMCP (managed by UV) for MCP server implementations.

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
# Segment 1: Zero (Install, CLI, First CLAUDE.md)
npm run segment1:verify      # Verify API setup
npm run segment1:workflows   # Terminal workflow demos

# Segment 2: Context (The CLAUDE.md Hierarchy)
# (No npm scripts in Segment 2. The lesson is markdown + live demos.)
# The legacy MCP memory server moved to segment_4_hero/memory_server/ as
# optional homework. To start it:
npm run mcp:memory             # Start memory server (via UV)

# Segment 3: Agents
npm run segment3:agent-loop   # Agent loop demonstration
npm run segment3:boundaries   # Permission boundaries demo

# Segment 4: Hero (Skills, Subagents, and MCP)
npm run segment4:workflows    # Production workflow demos
```

### MCP Memory Server (Python/UV)

The memory server is a Python FastMCP server managed by UV (not npm/tsx). It launches via `start.sh`, which handles dependency sync (`uv sync`), stale process cleanup, and graceful signal forwarding.

```bash
# Start standalone
cd segment_4_hero/memory_server
uv run python server.py

# Start via MCP Inspector for debugging
uv run -- fastmcp dev server.py

# Add to Claude Code
claude mcp add memory -- bash segment_4_hero/memory_server/start.sh

# List MCP servers
claude mcp list
```

### MCP Teaching Kit (`mcp-teaching-kit-main/`)

Standalone Python project adapted from Anthropic Academy's MCP courses. Demonstrates **every major MCP primitive** (tools, resources, prompts, sampling, elicitation, roots) wired through a `prompt_toolkit` CLI to Claude. This is the **test MCP server** registered as `DocumentMCP-ClaudeCode` in `.mcp.json` at the repo root so the CLI discovers it automatically (with a one-time approval prompt).

```bash
# Install deps
cd mcp-teaching-kit-main
uv pip install -e .

# Run the chat CLI standalone (uv preferred)
uv run main.py

# See every JSON-RPC frame (teaching microscope)
$env:MCP_WIRE_TRACE = "1"; python main.py    # PowerShell
MCP_WIRE_TRACE=1 python main.py              # bash
```

The kit has its own `CLAUDE.md` with the full primitives matrix, callback-registration gotchas, and the Windows `WindowsProactorEventLoopPolicy` requirement. Read it before touching any file in that subtree.

### Linting and Formatting

```bash
npx markdownlint-cli2 "**/*.md"  # Markdown linting
vale .                            # Prose linting (requires vale CLI)
npm run lint                      # TypeScript linting (ESLint)
npm run format                    # Format all files (Prettier)
```

### Drift Self-Checks (run before a delivery)

The course carries pinned facts (model lineup, MCP spec, file paths) that go stale. These scripts catch drift before it reaches a live class:

```bash
npm run audit:claude-md   # Audit the CLAUDE.md hierarchy for stale ground-truth tokens
npm run audit:paths       # Verify backticked file paths in CLAUDE.md files resolve on disk
npm run hooks:install     # Install the repo git hooks (safety-guard, tool-logger, etc.)
```

## Architecture

### Course Structure

Four segments, each with markdown guides and runnable TypeScript demos:

- `segment_1_quickstart/` — **Zero**: Claude Code install + first `CLAUDE.md`
- `segment_2_context/` — **Context**: CLAUDE.md at user/project/subdirectory scope, `@path/file.md` imports
- `segment_3_agents/` — **Agents**: agent loop, `--allowedTools`, boundary spec, subagents
- `segment_4_hero/` — **Hero**: skills (dynamic context injection), subagents, consuming MCP servers

### Utility Modules (`src/utils/`)

- `client.ts` — Anthropic client factory with model selection and cost formatting
- `logger.ts` — Colorful console logging for demos

### Additional Python Servers (`src/`)

- `copilot_tips_server.py` — FastMCP server for GitHub Copilot tips CRUD (teaching demo)
- `memory_server.py` — Alternative memory MCP server with DeepSeek-powered optimization
- `api_utils.py` — Python API utilities
- `test_copilot_tips_server.py`, `test_memory_server.py` — Test files for Python servers

### MCP Servers

**Memory Server** (`segment_4_hero/memory_server/server.py`) — Python FastMCP server demonstrating all three MCP primitives. Optional homework for Segment 4 learners who want to build, not just consume:

- **Tools**: `remember_decision`, `recall_decisions`, `add_convention`, `get_conventions`, `save_note`, `search_notes`, `set_context`, `get_context`, `memory_summary`
- **Resources**: `memory://decisions`, `memory://conventions`, `memory://notes`, `memory://context`
- **Prompts**: `decision_record`, `convention_proposal`, and others
- **Storage**: JSON file at `./data/memory.json` (configurable via `MCP_MEMORY_PATH`)
- **Dependencies**: `pyproject.toml` managed by UV — `fastmcp>=3.0.0`, `pydantic>=2.0.0`
- **Launcher**: `start.sh` — handles `uv sync`, stale process cleanup, signal forwarding

**Hello World MCP Server** (`src/hello-world-mcp-server/server.py`) — Scaffolded FastMCP example with CRUD tools, resources, prompts, and lifespan state management. Good reference for the mcp-scaffold skill output.

### Registered MCP Servers (`.mcp.json`)

Project-scoped servers live in **`.mcp.json` at the repo root** - the documented team-share
location the Claude Code CLI reads on startup. Committed to git so cloners get the canonical demo
targets without manual setup; the CLI prompts each learner to approve them once on first `claude`
launch. (This is NOT `.claude/settings.json` - the CLI does not read project MCP servers from
there. Personal overrides go in `~/.claude.json` or `settings.local.json`, both gitignored.)

- `microsoft-learn` — HTTP MCP server at `https://learn.microsoft.com/api/mcp`. Segment 4 "consume" demo target.
- `DocumentMCP-ClaudeCode` — stdio server spawned via `uv run --project mcp-teaching-kit-main mcp_server.py`. The bundled document corpus, sampling, elicitation, and roots primitives demo. Uses `${CLAUDE_PROJECT_DIR:-.}` so it resolves from any clone location.
- `github` — HTTP MCP server at `https://api.githubcopilot.com/mcp/` (Bearer `${GITHUB_TOKEN}`). GitHub tooling for the Segment 3 and 4 PR/issue demos.
- `memory` (optional, not pre-registered) — Local FastMCP memory server. Add it yourself with `claude mcp add memory -- bash segment_4_hero/memory_server/start.sh` if you want to build, not just consume.

A parallel `.vscode/mcp.json` registers `DocumentMCP-GitHubCopilot` (same server, different client) plus a Linux Foundation T&C HTTP MCP for VS Code's GitHub Copilot integration. Keep the two stdio entries in sync if you rename the kit.

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

Skills live in `.claude/skills/<name>/SKILL.md` (the successor to `.claude/commands/`, which still works for back-compat):

- `mcp-scaffold/` — Python MCP server scaffolding with FastMCP templates, validation scripts, and reference docs
  - `SKILL.md` — Main workflow with frontmatter
  - `references/` — FASTMCP-GUIDE.md, PATTERNS.md, DEPLOYMENT.md
  - `assets/templates/` — basic-server.py, full-server.py, requirements.txt
  - `scripts/` — scaffold.py, validate.py, init_project.py
- `review-changes/` — Reviews uncommitted changes for bugs and missing tests (Segment 4 skill demo)
- `claude-md-audit/` — Audits CLAUDE.md files across scopes (backs `npm run audit:claude-md`)
- `azure-bicep-skill/` — Azure Bicep authoring helper

### Custom Agents (`.claude/agents/`)

- `code-quality-coach.md` — Mentoring agent using code-review skill
- `release-manager.md` — DevOps agent using deploy-prep skill
- `claude-code-tutor.md` — Teaching agent for Claude Code concepts
- `python-mcp-expert.md` — Expert guide for building Python MCP servers with FastMCP
- `terraform-architect.md` — Terraform IaC expert for Azure/GCP infrastructure
- `azure-principal-architect.md` — Azure Well-Architected design and review

### Key Dependencies

**TypeScript/JavaScript** (package.json):

- `@anthropic-ai/sdk` — Anthropic API client
- `@modelcontextprotocol/sdk` — MCP server/client implementation
- `zod` — Schema validation for MCP tools
- `dotenv` — Environment variable loading
- `express` — HTTP server (for demos)

**Python** (managed per-server via UV + pyproject.toml):

- `fastmcp>=3.0.0` — Pythonic MCP server framework
- `pydantic>=2.0.0` — Data validation and serialization

### Environment Variables

Required: `ANTHROPIC_API_KEY`

Optional:

- `CLAUDE_MODEL` — Model selection (default: `claude-sonnet-5`, native 1M context)
- `MCP_MEMORY_PATH` — Memory server storage path (default: `./data/memory.json`)
- `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` — For GitHub integration demos (Segments 3 and 4)
- `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` — For Slack integration (Segment 3)

See `.env.example` for full configuration.

## Linting Configuration

- **Vale**: Microsoft, Google, proselint, write-good, alex, Readability, ai-tells styles. Config in `.vale.ini`.
- **markdownlint**: ATX headings, dash list markers, 2-space indent, no line length limit. See `.markdownlint.json`.
- **Prettier**: Single quotes, no trailing commas, 2-space tabs, LF line endings.

## Notable Gaps

- No `tsconfig.json` at project root by design. TypeScript demos run via `npx tsx` (JIT compilation), so `npm run build` (tsc) is intentionally not part of the course workflow.
- Skills live in `.claude/skills/<name>/SKILL.md`. The older `.claude/commands/` still works for back-compat but is superseded.
