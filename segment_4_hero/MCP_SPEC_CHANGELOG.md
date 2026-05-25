# MCP Spec Changelog: 2025-06-18 to 2025-11-25

Quick reference for what changed between the two spec revisions.
Tim: skim this on the train. Three things actually matter for class.

---

## 1. stderr Logging — Now Any Level (was: errors only)

**Before (2025-06-18):** stdio servers were expected to write only error-level
messages to stderr. Log output at info/debug level to stderr was technically
outside the spec.

**After (2025-11-25):** Servers MAY write any log level to stderr.
The spec formally acknowledges stderr as the logging channel for all
diagnostic output in stdio transport.

**Impact on your code:** Nothing to change — you were already doing
`print(..., file=sys.stderr)` for everything. This just makes it official.

**Teaching moment:** This is why `print(..., file=sys.stderr)` is the pattern,
not `logging.info(...)` to stdout. stdout belongs to JSON-RPC.

---

## 2. Streamable HTTP: 403 on Invalid Origin (new hard requirement)

**Before (2025-06-18):** The HTTP transport (then called SSE transport) had
informal guidance about CORS but no hard requirement on Origin validation.

**After (2025-11-25):** Servers using Streamable HTTP **MUST return 403 Forbidden**
when the `Origin` header does not match an expected value.

This is a security requirement, not a recommendation. It prevents
DNS rebinding attacks where a malicious page tricks a local MCP server
into accepting cross-origin requests.

**Impact on your code:** FastMCP 3.x handles this automatically for
Streamable HTTP servers. If you're running stdio (which the course memory
server does), this requirement does not apply.

**Teaching moment:** This is why you don't just expose `http://localhost:8000/mcp`
to the world — the Origin check is the CSRF defense for MCP servers.

---

## 3. SSE-Only Transport: Retired

**Before (2025-06-18):** The spec defined an SSE (Server-Sent Events) transport
where the server streamed events to the client over a long-lived GET connection
and received messages via a separate POST endpoint.

**After (2025-11-25):** The SSE-only transport is **retired**. It is replaced by
**Streamable HTTP**, which uses a single `/mcp` endpoint:

- Client POSTs JSON-RPC to `/mcp` with `Accept: application/json, text/event-stream`
- Server returns `200` with either a JSON body (for simple responses) or an SSE
  stream (for streamed responses)
- Server returns `202 Accepted` for notifications (no response body)

**Impact on your code:** If you're wiring up an Inspector connection manually,
select **stdio** (for local servers) or **streamable-http** (for remote).
Do NOT select "sse" — that option may still appear in older Inspector builds
but targets the retired transport.

**Teaching moment:** The unified `/mcp` endpoint is cleaner — one URL, one
content-type negotiation, no separate GET+POST dance.

---

## 4. Tools / Resources / Prompts Shape: No Changes

The three primitives (tools, resources, prompts) are structurally unchanged
between revisions. Capability negotiation syntax (`initialize` response with
`capabilities` object) is the same. FastMCP 3.x decorators
(`@mcp.tool`, `@mcp.resource`, `@mcp.prompt`) map 1:1 to the spec as before.

---

## 5. FastMCP 2.x -> 3.x: lifespan API Change (not a spec change, framework change)

This is NOT a spec change, but it bites everyone upgrading:

**FastMCP 2.x:** `lifespan` could yield any value; tools accessed it via
`ctx.state` directly.

**FastMCP 3.x:** `lifespan` must yield a **dict**; tools access it via
`ctx.lifespan_context["key"]`.

```python
# FastMCP 2.x (broken under 3.x)
@asynccontextmanager
async def lifespan(server):
    yield AppState(db=pool)          # yields object directly

async def my_tool(ctx: Context):
    state = ctx.state                # ctx.state no longer exists in 3.x
```

```python
# FastMCP 3.x (correct)
@asynccontextmanager
async def lifespan(server):
    yield {"state": AppState(db=pool)}  # yields dict

async def my_tool(ctx: Context):
    state = ctx.lifespan_context["state"]  # access via dict key
```

All course servers have been updated to the FastMCP 3.x pattern.

---

## Summary Table

| Change | Spec Rev | Affects stdio | Affects HTTP | Action Required |
|--------|----------|---------------|--------------|-----------------|
| stderr: any log level now allowed | 2025-11-25 | Yes | Yes | None — you were already doing this |
| HTTP: 403 on bad Origin is mandatory | 2025-11-25 | No | Yes | FastMCP handles it automatically |
| SSE-only transport retired | 2025-11-25 | No | Yes | Use "stdio" or "streamable-http" in Inspector |
| Tool/Resource/Prompt shape | Unchanged | - | - | None |
| FastMCP 2->3: lifespan yields dict | Framework | Yes | Yes | Use `ctx.lifespan_context["key"]` |
