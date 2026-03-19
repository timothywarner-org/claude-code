# FastMCP 3 Upgrade Assessment

**Date:** 2026-03-19
**Server:** `segment_2_mcp/memory_server/server.py`
**Current version:** `fastmcp>=2.0.0,<3.0.0` (pinned in `pyproject.toml`)
**Status:** Running reliably on v2 -- no upgrade recommended at this time

## Current Server Profile

The memory server is a teaching demo for the O'Reilly "Claude Code and Large-Context Reasoning" course. It exercises all three MCP primitives:

- **9 tools** -- CRUD for decisions, conventions, notes, key-value context, plus summary
- **5 resources** -- read-only JSON views of each data category
- **4 prompts** -- reusable templates (ADR, convention proposal, memory review, onboarding)
- **Transport:** stdio (no HTTP, no auth)
- **State:** Pydantic models persisted to local JSON via lifespan + `ctx.state`

## v2 APIs in Use

All of these are **backwards-compatible in v3** -- the surface API is unchanged:

```python
FastMCP(name=..., instructions=..., version=..., lifespan=...)
@mcp.tool(name=..., description=...)
@mcp.resource("memory://...", name=..., description=..., mime_type=...)
@mcp.prompt(name=..., description=...)
Context, ctx.state
mcp.run(transport="stdio")
```

The server would likely run on v3 without code changes.

## What FastMCP 3 Adds

| Feature | Description | Value for This Server |
|---|---|---|
| Per-component authorization | OAuth, CIMD, JWT validation, Azure OBO | **None** -- local stdio, no auth needed |
| Component versioning | `@tool(version="2.0")` alongside older versions | **None** -- single-version teaching demo |
| FileSystemProvider | Hot-reload tools from directories | **None** -- all tools intentionally in one file |
| Provider/Transform architecture | Composable server pipelines | **None** -- simple flat server by design |
| Concurrent sampling | `context.sample()` with parallel tool calls | **None** -- server doesn't use sampling |
| `fastmcp list` / `fastmcp call` | Query and invoke tools from terminal | **Nice to have** -- could demo tool inspection |
| `fastmcp generate-cli` | Auto-generate typed CLI from tool schemas | **Nice to have** -- standalone CLI for memory server |
| `fastmcp discover` | Scan editor configs for configured servers | **Minor** -- convenience for debugging |
| Background task notifications | Redis queue for progress updates | **None** -- no long-running tasks |

## Recommendation

**Stay on v2.** The headline v3 features (auth, providers, transforms, component versioning) solve problems this server doesn't have. The two genuinely useful CLI additions (`fastmcp list`, `fastmcp generate-cli`) can be demonstrated without upgrading the server itself.

### When to Reconsider

- Adding HTTP/SSE transport (remote access)
- Adding multi-tenant authentication
- Needing component versioning for live-upgrade demos
- If v2 reaches end-of-life or stops receiving security patches

## References

- [What's New in FastMCP 3.0](https://www.jlowin.dev/blog/fastmcp-3-whats-new)
- [Introducing FastMCP 3.0](https://www.jlowin.dev/blog/fastmcp-3)
- [FastMCP 3.0 is GA](https://www.jlowin.dev/blog/fastmcp-3-launch)
- [FastMCP Updates](https://gofastmcp.com/updates)
