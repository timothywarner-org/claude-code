# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Last revised: 2026-07-20

## How this repo teaches CLAUDE.md

This repo is the worked example for Segment 2 of the course. Five CLAUDE.md files at different scopes show the hierarchy in practice:

- `CLAUDE.md` (this file, repo root) - project-wide conventions
- `segment_1_quickstart/CLAUDE.md` - minimal demo conventions
- `segment_2_context/CLAUDE.md` - context-engineering rules
- `segment_3_agents/CLAUDE.md` - boundary spec (what Claude may and may not do)
- `segment_4_hero/CLAUDE.md` - skills/agents/MCP directory conventions

Open all five side-by-side. Each one is loaded automatically by Claude Code when working inside that subtree. See `segment_2_context/01_claude_md_at_every_scope.md` for the full lesson.

For the memory half of context engineering, `segment_2_context/memory_example/` is an inert teaching example of Claude Code's file-based memory: `MEMORY.example.md` is the index (one line per fact, loaded each session), `user_prefers_uv.example.md` is a `feedback` memory, and `project_azure_keyless.example.md` is a `project` memory. The `.example.md` suffix keeps the demo from being read as a live store. See `segment_2_context/memory_example/README.md`.

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

# Start the server on HTTP (reload OFF - see drift note), then connect Inspector
.venv/Scripts/python.exe -m fastmcp.cli run server.py --transport http --port 6280 --no-banner

# Add to Claude Code
claude mcp add memory -- bash segment_4_hero/memory_server/start.sh

# List MCP servers
claude mcp list
```

**fastmcp + Inspector drift (breaking, confirmed on fastmcp 3.3.1 / MCP Inspector 1.0.0, Python 3.14):** The one-shot `fastmcp dev server.py` from older docs is dead three ways over:

1. The subcommand moved to `fastmcp dev inspector <script>` (bare `dev` errors `Failed to canonicalize script path`).
2. The `fastmcp.exe` console-script trampoline can't resolve its interpreter on this Python 3.14 venv (same canonicalize error, emitted by the launcher shim). Use the venv `python.exe` directly.
3. Worse, `dev inspector` always forces `--reload`, and fastmcp 3.3.1's reload watcher passes `--no-reload` to a subcommand that rejects it, so the server dies on spawn (`Unknown option: "--no-reload"`) and the Inspector shows no server. Reload also disables **elicitation** and **sampling**, which the `delete_document` and `summarize_via_sampling` demos need.

The working pattern is **two pieces**: run the server on HTTP with reload off, then point the **standalone** Inspector at it. In the Inspector UI: **Transport = Streamable HTTP**, **URL = `http://127.0.0.1:6280/mcp`**, **Connect**.

**Bulletproof restart / post-reboot start (Windows, PS7):** `scripts/Start-MemoryInspector.ps1` does all of it - force-frees ports **6280** (server), **6274** (UI), **6277** (proxy), reaps orphaned children scoped to this server, starts the server, waits for it to bind, then launches the Inspector. Idempotent; run it from any state:

```powershell
# From Windows Terminal. -NoAuth = tokenless local class mode.
& 'C:\github\claude-code\scripts\Start-MemoryInspector.ps1' -NoAuth
```

**After a host reboot, that one command brings the whole demo back up.** `ANTHROPIC_API_KEY` is read from the process env (session key wins; `.env` is the fallback since `load_dotenv()` does not override an already-set var).

### MCP Teaching Kit (`mcp-teaching-kit-main/`)

Standalone Python project adapted from Anthropic Academy's MCP courses. Demonstrates **every major MCP primitive** (tools, resources, prompts, sampling, elicitation, roots) wired through a `prompt_toolkit` CLI to Claude. It is **not** registered in the repo-root `.mcp.json` for the Claude Code CLI; a parallel `.vscode/mcp.json` registers it as `DocumentMCP-GitHubCopilot` for VS Code's GitHub Copilot. The CLI's pre-registered stdio document server is the simpler `oreilly-july20-documentmcp` (see `mcp-example/mcp_cli/`).

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

- `segment_1_quickstart/` - **Zero**: Claude Code install + first `CLAUDE.md`
- `segment_2_context/` - **Context**: CLAUDE.md at user/project/subdirectory scope, `@path/file.md` imports
- `segment_3_agents/` - **Agents**: agent loop, `--allowedTools`, boundary spec, subagents
- `segment_4_hero/` - **Hero**: skills (dynamic context injection), subagents, consuming MCP servers

### Utility Modules (`src/utils/`)

- `client.ts` - Anthropic client factory with model selection and cost formatting
- `logger.ts` - Colorful console logging for demos

### Additional Python Servers (`src/`)

- `copilot_tips_server.py` - FastMCP server for GitHub Copilot tips CRUD (teaching demo)
- `memory_server.py` - Alternative memory MCP server with DeepSeek-powered optimization
- `api_utils.py` - Python API utilities
- `test_copilot_tips_server.py`, `test_memory_server.py` - Test files for Python servers

### MCP Servers

**Memory Server** (`segment_4_hero/memory_server/server.py`) - Python FastMCP server demonstrating all three MCP primitives. Optional homework for Segment 4 learners who want to build, not just consume:

- **Tools**: `remember_decision`, `recall_decisions`, `add_convention`, `get_conventions`, `save_note`, `search_notes`, `set_context`, `get_context`, `memory_summary`
- **Resources**: `memory://decisions`, `memory://conventions`, `memory://notes`, `memory://context`
- **Prompts**: `decision_record`, `convention_proposal`, and others
- **Storage**: JSON file at `./data/memory.json` (configurable via `MCP_MEMORY_PATH`)
- **Dependencies**: `pyproject.toml` managed by UV - `fastmcp>=3.0.0`, `pydantic>=2.0.0`
- **Launcher**: `start.sh` - handles `uv sync`, stale process cleanup, signal forwarding

**Hello World MCP Server** (`src/hello-world-mcp-server/server.py`) - Scaffolded FastMCP example with CRUD tools, resources, prompts, and lifespan state management. Good reference for the mcp-scaffold skill output.

### Registered MCP Servers (`.mcp.json`)

Project-scoped servers live in **`.mcp.json` at the repo root** - the documented team-share
location the Claude Code CLI reads on startup. Committed to git so cloners get the canonical demo
targets without manual setup; the CLI prompts each learner to approve them once on first `claude`
launch. (This is NOT `.claude/settings.json` - the CLI does not read project MCP servers from
there. Personal overrides go in `~/.claude.json` or `settings.local.json`, both gitignored.)

- `microsoft-learn` - HTTP MCP server at `https://learn.microsoft.com/api/mcp`. Segment 4 "consume" demo target.
- `oreilly-july20-documentmcp` - stdio server spawned via `uv run --project mcp-example/mcp_cli mcp_server.py`. The simple in-memory DocumentMCP server (tools `read_doc_contents`/`edit_document`, `docs://` resources, a `format` prompt). Uses `${CLAUDE_PROJECT_DIR:-.}` so it resolves from any clone location. Drive it in the Inspector with `scripts/Start-DocumentInspector.ps1`.
- `oreilly-july20-memorymcp` - stdio server spawned via `uv run --project segment_4_hero/memory_server server.py`. The FastMCP memory server (9 tools). Drive it in the Inspector with `scripts/Start-MemoryInspector.ps1`.
- `github` - HTTP MCP server at `https://api.githubcopilot.com/mcp/` (Bearer `${GITHUB_TOKEN}`). GitHub tooling for the Segment 3 and 4 PR/issue demos.

A parallel `.vscode/mcp.json` registers `DocumentMCP-GitHubCopilot` (the `mcp-teaching-kit-main/` server, for VS Code's GitHub Copilot) plus a Linux Foundation T&C HTTP MCP. That kit server is intentionally VS-Code-only; the Claude Code CLI's document server is the separate `oreilly-july20-documentmcp` in `.mcp.json`.

### Hooks (`hooks/`)

Teaching examples of Claude Code hooks. Shell scripts live in `hooks/scripts/`:

- `safety-guard.sh` - PreToolUse: blocks dangerous git/rm commands (exit code 2 = deny)
- `tool-logger.sh` - PostToolUse: logs all tool calls to `.claude/logs/tool-usage.log`
- `auto-format.sh` - PostToolUse: runs Prettier/Ruff on edited files
- `console-log-detector.sh` - PostToolUse: warns about `console.log` in JS/TS edits
- `session-summary.sh` - Stop: prints git status and tool usage stats at session end

Install via merging `hooks/hooks-settings-template.json` into `.claude/settings.json`.

### Automation Scripts (`scripts/`)

TypeScript utility scripts run via `npx tsx scripts/<name>.ts`:

- `verify-setup.ts` - Environment configuration checker
- `check-docs.ts` - Documentation validator
- `claude-review.ts` - Code review automation
- `generate-release-notes.ts` - Release notes generator
- `security-scan.ts` - Security scanning utility

### Custom Skills (`.claude/skills/`)

Skills live in `.claude/skills/<name>/SKILL.md` (the successor to `.claude/commands/`, which still works for back-compat):

- `mcp-scaffold/` - Python MCP server scaffolding with FastMCP templates, validation scripts, and reference docs
  - `SKILL.md` - Main workflow with frontmatter
  - `references/` - FASTMCP-GUIDE.md, PATTERNS.md, DEPLOYMENT.md
  - `assets/templates/` - basic-server.py, full-server.py, requirements.txt
  - `scripts/` - scaffold.py, validate.py, init_project.py
- `review-changes/` - Reviews uncommitted changes for bugs and missing tests (Segment 4 skill demo)
- `claude-md-audit/` - Audits CLAUDE.md files across scopes (backs `npm run audit:claude-md`)
- `azure-bicep-skill/` - Azure Bicep authoring helper
- `azure-ai-deploy/` - Ships a Python GenAI app to Azure keyless via `DefaultAzureCredential` and azd; includes `resources/references/` (AZURE-AUTH.md, DEPLOY-CHECKLIST.md), `resources/templates/` (azure.yaml, chat_client.py), and `resources/scripts/preflight.py`
- `genai-prompt-eval/` - Scores GenAI outputs on groundedness, relevance, coherence, and safety before ship; includes `resources/references/EVAL-DIMENSIONS.md`, `resources/templates/eval_cases.jsonl`, and `resources/scripts/run_eval.py`

### Custom Agents (`.claude/agents/`)

- `code-quality-coach.md` - Mentoring agent using code-review skill
- `release-manager.md` - DevOps agent using deploy-prep skill
- `claude-code-tutor.md` - Teaching agent for Claude Code concepts
- `python-mcp-expert.md` - Expert guide for building Python MCP servers with FastMCP
- `terraform-architect.md` - Terraform IaC expert for Azure/GCP infrastructure
- `azure-principal-architect.md` - Azure Well-Architected design and review
- `azure-genai-deployer.md` - Deploys Python GenAI apps to Azure via azd, enforcing keyless auth (`DefaultAzureCredential`, managed identity) with no API keys in code
- `genai-eval-runner.md` - Runs evaluation suites (groundedness, relevance, safety, regression) against GenAI outputs and gives a pass/fail verdict before a deploy ships

### Project Rules (`.claude/rules/`)

Focused rule files that set project conventions for the Python GenAI-on-Azure track. Claude Code reads them alongside CLAUDE.md when working in this repo:

- `python-genai.md` - Python generative-AI coding conventions
- `azure-deployment.md` - Azure deployment rules (azd-first, keyless auth)
- `secrets-security.md` - Secret handling and security guardrails
- `testing.md` - Testing requirements for GenAI code
- `project-conventions.md` - General project conventions

### Custom Commands (`.claude/commands/`)

Slash commands that drive the GenAI-on-Azure workflows. `.claude/settings.json` carries commented hook examples and a commands pointer:

- `deploy-genai.md` - `/deploy-genai` walks a Python GenAI app through the pre-deploy gate and azd deploy to Azure, keyless
- `eval-prompts.md` - `/eval-prompts` runs the prompt-eval suite and reports scores against the ship thresholds

### Key Dependencies

**TypeScript/JavaScript** (package.json):

- `@anthropic-ai/sdk` - Anthropic API client
- `@modelcontextprotocol/sdk` - MCP server/client implementation
- `zod` - Schema validation for MCP tools
- `dotenv` - Environment variable loading
- `express` - HTTP server (for demos)

**Python** (managed per-server via UV + pyproject.toml):

- `fastmcp>=3.0.0` - Pythonic MCP server framework
- `pydantic>=2.0.0` - Data validation and serialization

### Environment Variables

Required: `ANTHROPIC_API_KEY`

Optional:

- `CLAUDE_MODEL` - Model selection (default: `claude-sonnet-5`, native 1M context)
- `MCP_MEMORY_PATH` - Memory server storage path (default: `./data/memory.json`)
- `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` - For GitHub integration demos (Segments 3 and 4)
- `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` - For Slack integration (Segment 3)

See `.env.example` for full configuration.

## Linting Configuration

- **Vale**: Microsoft, Google, proselint, write-good, alex, Readability, ai-tells styles. Config in `.vale.ini`.
- **markdownlint**: ATX headings, dash list markers, 2-space indent, no line length limit. See `.markdownlint.json`.
- **Prettier**: Single quotes, no trailing commas, 2-space tabs, LF line endings.

## Notable Gaps

- No `tsconfig.json` at project root by design. TypeScript demos run via `npx tsx` (JIT compilation), so `npm run build` (tsc) is intentionally not part of the course workflow.
- Skills live in `.claude/skills/<name>/SKILL.md`. The older `.claude/commands/` still works for back-compat but is superseded.
