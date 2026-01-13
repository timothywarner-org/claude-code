# MCP Quick Start

Model Context Protocol (MCP) gives Claude persistent memory and access to external tools.

## What is MCP?

MCP is an open standard that enables Claude to:

- **Remember context** across sessions
- **Access external tools** (GitHub, Slack, databases)
- **Read resources** (files, APIs, documentation)

```
┌──────────────┐        ┌──────────────┐       ┌──────────────┐
│   Claude     │◄──────►│  Claude Code │◄─────►│ MCP Server   │
│   (LLM)      │        │  (Host)      │       │ (Your Tools) │
└──────────────┘        └──────────────┘       └──────────────┘
```

## Installing MCP Servers with Claude CLI

### Method 1: Add via CLI (Recommended)

```bash
# Add a local MCP server
claude mcp add memory -- npx tsx ./segment_2_mcp/memory_server/server.ts

# Add an npm-published server
claude mcp add github -- npx -y @modelcontextprotocol/server-github

# Add with environment variables
claude mcp add github -- npx -y @modelcontextprotocol/server-github \
  --env GITHUB_TOKEN=ghp_your_token
```

### Method 2: Add via JSON Configuration

```bash
# Add server using JSON config
claude mcp add-json memory '{
  "command": "npx",
  "args": ["tsx", "./segment_2_mcp/memory_server/server.ts"],
  "env": {
    "MCP_MEMORY_PATH": "./data/memory.json"
  }
}'
```

### Managing MCP Servers

```bash
# List configured servers
claude mcp list

# Remove a server
claude mcp remove memory

# Test MCP configuration
claude --mcp-debug

# View available MCP tools
claude /mcp
```

## Using the Memory Server

This course includes a production-ready memory server. Set it up:

```bash
# Add the memory server
claude mcp add memory -- npx tsx ./segment_2_mcp/memory_server/server.ts

# Start Claude Code with MCP debug
claude --mcp-debug
```

### Memory Server Tools

Once connected, Claude can use these tools:

| Tool | Description |
|------|-------------|
| `remember_decision` | Store architectural decisions |
| `recall_decisions` | Search past decisions |
| `add_convention` | Record coding conventions |
| `get_conventions` | Retrieve conventions |
| `add_note` | Store general notes |
| `search_notes` | Search notes |
| `set_context` | Store key-value context |
| `get_context` | Retrieve context |
| `memory_summary` | Overview of all stored memory |

### Example Usage

In Claude Code, try:

```
> Remember that we chose PostgreSQL over MySQL for better JSON support

> What database did we decide to use?

> Add a convention: All API endpoints should return JSON with { data, error } format

> What are our coding conventions?
```

## Adding Official MCP Servers

### GitHub Server

```bash
# Set your GitHub token
export GITHUB_TOKEN=ghp_your_token

# Add GitHub server
claude mcp add github -- npx -y @modelcontextprotocol/server-github
```

Now Claude can:
- Search repositories
- Read file contents
- Create issues and PRs
- Review code changes

### Filesystem Server

```bash
# Add filesystem access to specific directories
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem ./src ./docs
```

Now Claude can read/write files in those directories.

## Configuration Files

### Project-Level Config (`.claude/settings.json`)

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["tsx", "./segment_2_mcp/memory_server/server.ts"],
      "env": {
        "MCP_MEMORY_PATH": "./data/memory.json"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### User-Level Config (`~/.claude/settings.json`)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "~"]
    }
  }
}
```

## MCP vs Claude Without MCP

| Feature | Without MCP | With MCP |
|---------|-------------|----------|
| Memory | Forgets after session | Persists decisions, conventions |
| External tools | None | GitHub, Slack, databases |
| File access | Through Claude Code | Direct via filesystem server |
| Customization | Limited | Unlimited (build your own) |

## Troubleshooting

### Server won't start

```bash
# Check the command works standalone
npx tsx ./segment_2_mcp/memory_server/server.ts

# Enable debug mode
claude --mcp-debug
```

### Server not showing tools

```bash
# List available tools
claude /mcp

# Check server is running
claude mcp list
```

### Permission errors

Ensure the MCP server has access to required paths and environment variables.

## Next Steps

1. Add the memory server to your project
2. Try storing some decisions and conventions
3. Continue to Segment 3 to learn about agentic mode
