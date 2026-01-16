# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

O'Reilly Live Learning course materials for "Claude Code and Large-Context Reasoning" - a 4-hour training focused on Claude Code CLI, MCP servers, agentic workflows, and custom skills. Uses TypeScript/JavaScript with the Anthropic SDK and MCP SDK, plus Python with FastMCP for MCP server examples.

## Development Commands

```bash
# Install dependencies
npm install

# Verify environment setup
npm run verify

# Build TypeScript
npm run build

# Run any demo file
npx tsx <path-to-file.ts>
```

### Course Demo Commands

```bash
# Segment 1: Claude Code Quick Start
npm run segment1:verify      # Verify API setup
npm run segment1:workflows   # Terminal workflow demos

# Segment 2: MCP (Model Context Protocol)
npm run segment2:architecture  # MCP architecture visualization
npm run segment2:memory        # Start memory server

# Segment 3: Agents
npm run segment3:agent-loop   # Agent loop demonstration
npm run segment3:boundaries   # Permission boundaries demo

# Segment 4: Skills + Agents
npm run segment4:workflows    # Production workflow demos
```

### MCP Memory Server

```bash
# Start standalone
npm run mcp:memory

# Add to Claude Code
claude mcp add memory -- npx tsx segment_2_mcp/memory_server/server.ts

# List MCP servers
claude mcp list
```

### Linting & Formatting

```bash
npx markdownlint-cli2 "**/*.md"  # Markdown linting
vale .                            # Prose linting (requires vale CLI)
npm run lint                      # TypeScript linting
npm run format                    # Format all files
```

## Architecture

### Course Structure

The course is organized into 4 segments:

- `segment_1_quickstart/` - Claude Code CLI installation and basic workflows
- `segment_2_mcp/` - Model Context Protocol servers and memory persistence
- `segment_3_agents/` - Agentic loops, autonomous operations, boundaries
- `segment_4_skills_agents/` - Custom skills and production workflows

### Utility Modules (`src/utils/`)

- `client.ts` - Anthropic client factory with model selection and cost formatting
- `logger.ts` - Colorful console logging for demos

### MCP Memory Servers

Two equivalent implementations demonstrating MCP primitives:

#### TypeScript (`segment_2_mcp/memory_server/server.ts`)

- **Tools**: `remember_decision`, `recall_decisions`, `add_convention`, `get_conventions`, `add_note`, `search_notes`, `set_context`, `get_context`, `memory_summary`
- **Resources**: `memory://decisions`, `memory://conventions`, `memory://notes`, `memory://context`
- **Storage**: JSON file at `./data/memory.json` (configurable via `MCP_MEMORY_PATH`)

#### Python (`segment_2_mcp/python_memory_server/server.py`)

Production-ready FastMCP server demonstrating all MCP primitives:

- **Tools**: 9 tools for decisions, conventions, notes, and context
- **Resources**: 6 resources including dynamic URI templates (`memory://decisions/{id}`)
- **Prompts**: 4 reusable templates (decision_template, convention_template, context_review, onboarding_guide)
- **Storage**: JSON file at `./data/python_memory.json`

```bash
# Install Python dependencies
pip install -r segment_2_mcp/python_memory_server/requirements.txt

# Add to Claude Code
claude mcp add python-memory -- python segment_2_mcp/python_memory_server/server.py
```

### Custom Skills (`.claude/commands/`)

Multi-file skills with scripts and documentation:

- `code-review/` - Security scanning, performance analysis, lint checks
- `deploy-prep/` - Pre-flight validation, changelog generation, release prep
- `mcp-scaffold/` - Python MCP server scaffolding with FastMCP templates, validation scripts, and reference docs. Includes:
  - `SKILL.md` - Main workflow with frontmatter
  - `references/` - FASTMCP-GUIDE.md, PATTERNS.md, DEPLOYMENT.md
  - `assets/templates/` - basic-server.py, full-server.py, requirements.txt
  - `scripts/` - scaffold.py, validate.py, init_project.py

### Custom Agents (`.claude/agents/`)

Specialized agents that leverage skills:

- `code-quality-coach.md` - Mentoring agent using code-review skill
- `release-manager.md` - DevOps agent using deploy-prep skill
- `claude-code-tutor.md` - Teaching agent for Claude Code concepts
- `python-mcp-expert.md` - Expert guide for building Python MCP servers with FastMCP

### Key Dependencies

**TypeScript/JavaScript:**
- `@anthropic-ai/sdk` - Anthropic API client
- `@modelcontextprotocol/sdk` - MCP server/client implementation
- `zod` - Schema validation for MCP tools

**Python:**
- `fastmcp` - Pythonic MCP server framework
- `pydantic` - Data validation and serialization

### Environment Variables

Required: `ANTHROPIC_API_KEY`

Optional:
- `CLAUDE_MODEL` - Model selection (default: `claude-sonnet-4-20250514`)
- `MCP_MEMORY_PATH` - Memory server storage path (default: `./data/memory.json`)
- `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` - For GitHub integration demos (Segments 3 & 4)
- `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` - For Slack integration (Segment 3)

See `.env.example` for full configuration.

## Linting Configuration

- **Vale**: Microsoft, Google, proselint, write-good, alex, Readability, ai-tells styles. Config in `.vale.ini`.
- **markdownlint**: ATX headings, dash list markers, 2-space indent, no line length limit. See `.markdownlint.json`.
- **Prettier**: Single quotes, no trailing commas, 2-space tabs, LF line endings.
- **TypeScript**: Strict mode with ES module output.
