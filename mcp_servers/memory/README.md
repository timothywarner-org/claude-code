# Project Memory MCP Server

A production-ready MCP server that provides persistent memory for Claude Code sessions. Store architectural decisions, coding conventions, project notes, and context that persists across conversations.

## Features

- **Decisions**: Store architectural and technical decisions with rationale
- **Conventions**: Document coding standards and rules
- **Notes**: Keep project documentation and knowledge
- **Context**: Key-value storage for project configuration
- **Search**: Full-text search across all memory types
- **Resources**: Read-only access for context injection

## Installation

```bash
cd mcp_servers/memory
npm install
npm run build
```

## Usage with Claude Code

### Add the server

```bash
# Development (with auto-reload)
claude mcp add memory -- npx tsx /path/to/memory/src/index.ts

# Production (after build)
claude mcp add memory -- node /path/to/memory/dist/index.js
```

### Verify installation

```bash
claude mcp list
```

## Available Tools

### `store_decision`

Store an architectural or technical decision.

```
Arguments:
- title: Brief title for the decision
- description: Detailed description
- rationale: Why this decision was made
- tags: (optional) Tags for categorization
```

### `store_convention`

Store a coding convention or standard.

```
Arguments:
- category: Category (e.g., naming, formatting, architecture)
- rule: The convention rule
- examples: (optional) Example code snippets
- enforced: (optional) Whether strictly enforced
```

### `store_note`

Store a general project note.

```
Arguments:
- title: Note title
- content: Note content (supports markdown)
- tags: (optional) Tags for categorization
```

### `store_context`

Store key-value context information.

```
Arguments:
- key: Context key (e.g., "database_type")
- value: Context value
- description: (optional) Description
```

### `search_memory`

Search across all memory types.

```
Arguments:
- query: Search query
- type: (optional) Type to search (all, decisions, conventions, notes, context)
```

### `delete_memory`

Delete an item from memory.

```
Arguments:
- id: ID of the item to delete
- type: Type of memory item (decision, convention, note, context)
```

## Available Resources

| URI | Description |
|-----|-------------|
| `memory://decisions` | All stored decisions (JSON) |
| `memory://conventions` | All stored conventions (JSON) |
| `memory://notes` | All stored notes (JSON) |
| `memory://context` | All context items (JSON) |
| `memory://summary` | Human-readable summary (Markdown) |

## Available Prompts

| Name | Description |
|------|-------------|
| `review_decisions` | Review decisions and suggest updates |
| `generate_onboarding` | Generate onboarding docs from memory |

## Storage Location

By default, memory is stored at:
- `~/.claude-memory/memory.json`

Override with environment variables:
- `MEMORY_DIR`: Directory for memory storage
- `MEMORY_FILE`: Full path to memory file

## Example Workflow

```
User: Let's document our decision to use PostgreSQL

Claude: I'll store that architectural decision.
[Uses store_decision tool]

User: What decisions have we made?

Claude: Let me search our memory.
[Uses search_memory tool or reads memory://decisions resource]

User: Generate onboarding docs

Claude: I'll use the onboarding prompt to generate comprehensive docs.
[Uses generate_onboarding prompt]
```

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## License

MIT
