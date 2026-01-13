# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

O'Reilly Live Learning course materials for "Claude Code and Large-Context Reasoning" - a 4-hour training focused on Claude Code CLI, MCP servers, agentic workflows, and custom skills. Uses TypeScript/JavaScript with the Anthropic SDK and MCP SDK.

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

### MCP Memory Server (`segment_2_mcp/memory_server/server.ts`)

A complete MCP server demonstrating persistent memory:

- **Tools**: `store_memory`, `recall_memories`, `list_entities`, `delete_memory`, `create_relation`, `search_graph`
- **Resources**: `memory://entities`, `memory://relations`
- **Storage**: JSON file at `./data/memory.json` (configurable via `MCP_MEMORY_PATH`)

### Custom Skills (`.claude/commands/`)

Example skills included:

- `review.md` - Code review workflow
- `fix-issue.md` - GitHub issue fix workflow

### Key Dependencies

- `@anthropic-ai/sdk` - Anthropic API client
- `@modelcontextprotocol/sdk` - MCP server/client implementation
- `zod` - Schema validation for MCP tools

### Environment Variables

Required: `ANTHROPIC_API_KEY`

Optional: `CLAUDE_MODEL`, `MCP_MEMORY_PATH`

See `.env.example` for full configuration.

## Linting Configuration

- **Vale**: Microsoft, Google, proselint, write-good, alex, Readability, ai-tells styles. Config in `.vale.ini`.
- **markdownlint**: ATX headings, dash list markers, 2-space indent, no line length limit. See `.markdownlint.json`.
- **Prettier**: Single quotes, no trailing commas, 2-space tabs, LF line endings.
- **TypeScript**: Strict mode with ES module output.
