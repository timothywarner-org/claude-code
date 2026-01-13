# JSON Memory Server

A Model Context Protocol (MCP) server that provides persistent memory for Claude.

## Features

- **Decisions**: Store architectural and design decisions with rationale
- **Conventions**: Record coding conventions and best practices
- **Notes**: General-purpose note storage
- **Context**: Key-value store for project context

## Installation

### Add to Claude Code

```bash
# Using the CLI
claude mcp add memory -- npx tsx ./segment_3_mcp/02_json_memory_server/server.ts

# Or add to .claude/settings.json
```

### Configuration in settings.json

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["tsx", "./segment_3_mcp/02_json_memory_server/server.ts"],
      "env": {
        "MCP_MEMORY_PATH": "./data/memory.json"
      }
    }
  }
}
```

## Tools

### Decisions

| Tool | Description |
|------|-------------|
| `remember_decision` | Store a new decision with title, description, and rationale |
| `recall_decisions` | Search decisions by query or tag |

### Conventions

| Tool | Description |
|------|-------------|
| `add_convention` | Record a coding convention with examples |
| `get_conventions` | List conventions, optionally filtered by category |

### Notes

| Tool | Description |
|------|-------------|
| `add_note` | Save a general note |
| `search_notes` | Search through notes |

### Context

| Tool | Description |
|------|-------------|
| `set_context` | Store a key-value pair |
| `get_context` | Retrieve context values |
| `memory_summary` | Get counts of all stored items |

## Resources

| URI | Description |
|-----|-------------|
| `memory://decisions` | All decisions as JSON |
| `memory://conventions` | All conventions as JSON |
| `memory://notes` | All notes as JSON |
| `memory://context` | All context key-values |

## Usage Examples

### Store a Decision

```
Claude, remember this decision:
Title: Use Zod for validation
Description: All API inputs should be validated using Zod schemas
Rationale: Provides runtime type safety and good TypeScript integration
Tags: validation, api, typescript
```

### Recall Decisions

```
What decisions have we made about API design?
```

### Add a Convention

```
Add this coding convention:
Name: Error handling
Description: All async functions should use try/catch with specific error types
Category: error-handling
Example: try { await operation(); } catch (e) { if (e instanceof ValidationError) ... }
```

### Set Context

```
Set context: current_sprint = "Sprint 23"
Set context: primary_database = "PostgreSQL"
```

## Data Storage

By default, memory is stored in `./data/memory.json`. Override with:

```bash
MCP_MEMORY_PATH=/custom/path/memory.json npx tsx server.ts
```

## Best Practices

1. **Use descriptive titles** for decisions and notes
2. **Add tags** to make searching easier
3. **Record rationale** to understand why decisions were made
4. **Update context** when project details change
5. **Review periodically** to keep memory relevant
