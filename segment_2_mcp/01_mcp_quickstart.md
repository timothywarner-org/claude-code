# MCP Quick Start

Model Context Protocol (MCP) gives Claude persistent memory and access to external tools.

> **Spec version:** MCP **2025-11-25** (the current stable revision as of May 2026).

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

## Transports

MCP 2025-11-25 defines two standard transports:

- **stdio** - client spawns the server as a child process, writes JSON-RPC to stdin, reads from stdout. Servers may write any log level to stderr. Best for local tools.
- **Streamable HTTP** - client POSTs JSON-RPC to `/mcp`. Server returns 202 for notifications and 200 with JSON or an SSE stream for requests. Servers must return 403 on an invalid `Origin` header. Best for remote/shared servers.

> The older SSE-only transport is **retired** as of MCP 2025-11-25. Use Streamable HTTP for remote servers.

## Installing MCP Servers with Claude CLI

### Method 1: Add via CLI (Recommended for stdio servers)

```bash
# Add the course memory server (Python/UV, stdio transport)
claude mcp add memory -- bash segment_2_mcp/memory_server/start.sh

# Add an npm-published server
claude mcp add github -- npx -y @modelcontextprotocol/server-github

# Add with environment variables
claude mcp add github -- npx -y @modelcontextprotocol/server-github \
  --env GITHUB_TOKEN=ghp_your_token
```

### Method 2: Add via JSON Configuration

```bash
# stdio server — explicit JSON shape
claude mcp add-json memory '{"type":"stdio","command":"bash","args":["segment_2_mcp/memory_server/start.sh"]}'

# HTTP server (Streamable HTTP transport)
claude mcp add-json microsoft-learn '{"type":"http","url":"https://learn.microsoft.com/api/mcp"}'
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

This course includes a production-ready memory server (Python + FastMCP + UV). Set it up:

```bash
# Sync dependencies (first time only)
cd segment_2_mcp/memory_server
uv sync

# Add the memory server to Claude Code
claude mcp add memory -- bash segment_2_mcp/memory_server/start.sh

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
      "type": "stdio",
      "command": "bash",
      "args": ["segment_2_mcp/memory_server/start.sh"]
    },
    "github": {
      "type": "stdio",
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
      "type": "stdio",
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

## MCP Inspector (Interactive Testing)

MCP Inspector is a browser-based UI for exploring any MCP server. Run it via FastMCP's dev mode:

```bash
cd segment_2_mcp/memory_server
uv run -- fastmcp dev server.py
```

Inspector opens at `http://localhost:6274` <!-- verify port at run time -->. When connecting manually, select transport **stdio** (not "sse" - that transport is retired in MCP 2025-11-25).

## Troubleshooting

### Server won't start

```bash
# Sync dependencies and test standalone
cd segment_2_mcp/memory_server
uv sync
uv run python server.py

# Enable debug mode in Claude Code
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

## Advanced MCP Concepts (deeper-dive material)

The basics above cover tools, resources, and prompts. Here are four advanced concepts you'll meet once you move past hello-world servers — useful context for the Q&A portion of class.

### Sampling

**Sampling** lets the *server* request LLM generation from the *client* instead of calling an LLM directly. The server crafts a message list, calls `create_message()`, and the client runs the model and returns the result. The server never holds an API key, never pays for tokens, and never authenticates against a model provider. This is the right pattern for **publicly hosted MCP servers** that need LLM help without taking on the cost or security burden.

### Log and progress notifications

Tools that take more than a second should report progress so users do not think the server has hung. The Python SDK passes a `Context` as the last argument to tool functions:

```python
@mcp.tool
async def index_repo(path: str, ctx: Context) -> str:
    await ctx.info(f"Scanning {path}")
    for i, file in enumerate(files):
        await ctx.report_progress(i, total=len(files))
        ...
```

The client registers callbacks (a logging callback at session creation, a progress callback per `call_tool`) and decides how to render them — terminal, web UI, status bar. Optional but a strong UX win for any tool that takes more than a second.

### Roots

**Roots** are file or folder paths a user pre-authorizes a server to touch. Without roots, a user has to type full paths (`convert /Users/tim/videos/promo/2026-05/bikin.mp4`) because the server has no idea where files live. With roots, the user grants `/Users/tim/videos` at startup, and the server exposes a `list_roots` tool plus an `is_path_allowed()` check inside every file-touching tool.

> The Python MCP SDK **does not enforce root restrictions automatically**. The server author must call `is_path_allowed()` (or equivalent) inside every tool that touches the filesystem. If you forget, the root is documentation, not security.

### Streamable HTTP internals (when stdio is not enough)

HTTP is unidirectional by nature — clients call servers, not the other way around. That breaks **server-to-client** message types: sampling requests, progress notifications, logging messages. Streamable HTTP works around this with **two SSE connections**:

| Connection | Lifecycle | Carries |
|------------|-----------|---------|
| Long-lived SSE (client GET with session ID) | Open for the whole session | Server-initiated requests: sampling, progress, logging |
| Short-lived SSE (response to a specific POST) | Closes when the tool result is sent | Streamed tool output for one call |

The session ID returned in the initialize response routes everything to the right SSE stream. Two flags will quietly break this:

- `stateless: true` — turns off session IDs entirely. Required for horizontal scaling behind a load balancer (without it, GET and POST may hit different server instances and the routing breaks). Cost: **no sampling, no progress, no logging, no resource subscriptions.**
- `jsonResponse: true` — POST responses return one JSON blob instead of an SSE stream. The client waits for the whole tool to finish before seeing anything. Cost: **no streamed progress or logs during execution.**

> **Footgun**: stdio supports everything by default. Streamable HTTP with the two flags above does not. Develop on the transport you will deploy on, or you will ship a server that works on your laptop and fails in production.

## Next Steps

1. Add the memory server to your project
2. Try storing some decisions and conventions
3. Continue to Segment 3 to learn about agentic mode
