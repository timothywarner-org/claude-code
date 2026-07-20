# DocumentMCP

A **simple in-memory MCP server** (`mcp_server.py`) that exposes a handful of documents through all three MCP primitives. Use it to demo how an MCP server is consumed - from the **MCP Inspector** and from **Claude Code**.

> **Attribution:** This code is reference material from Anthropic's [Claude with the Anthropic API](https://anthropic.skilljar.com/claude-with-the-anthropic-api/) Skilljar course. See [`./NOTICE.md`](./NOTICE.md) for full attribution and modifications.

## What the server exposes

| Primitive | Name | What it does |
|-----------|------|--------------|
| Tool | `read_doc_contents` | Read a document by id |
| Tool | `edit_document` | Replace an exact string inside a document |
| Resource | `docs://documents` | List all document ids |
| Resource | `docs://documents/{doc_id}` | Fetch one document's contents |
| Prompt | `format` | Rewrite a document in Markdown |

The document corpus lives in the `docs` dictionary at the top of `mcp_server.py`. Add entries there to give yourself more to poke at.

## Prerequisites

- **uv** ([install](https://github.com/astral-sh/uv)) - manages this project's own `.venv`, deps, and Python 3.13 pin. First run of either path below auto-syncs the venv (~20s cold, ~1.5s warm).
- **Node.js** - the Inspector launcher shells out to `npx`.

Neither consumer below needs an Anthropic API key. The server holds no secrets; it just serves in-memory documents.

## 1. MCP Inspector (browser UI)

`scripts/Start-DocumentInspector.ps1` is the on-rails, idempotent launcher. It starts the server on **Streamable HTTP** and opens the standalone Inspector so you can call tools, read resources, and invoke the `format` prompt by hand. Run it from the repo root - it works from any cwd:

```powershell
.\scripts\Start-DocumentInspector.ps1 -NoAuth
```

Then in the Inspector tab:

- **Transport Type:** Streamable HTTP
- **URL:** `http://127.0.0.1:6290/mcp`
- click **Connect**

The launcher force-frees ports **6290** (server) / **6284** (UI) / **6287** (proxy) and reaps stale children before starting, so re-running it from any state - including after a reboot - brings the demo up clean. `-NoAuth` disables the Inspector session token for a frictionless local demo; it binds to `127.0.0.1` only, so never use it on a shared or exposed host.

### How it works (design notes)

`mcp_server.py` hardcodes `mcp.run(transport="stdio")` in its `__main__` block, because Claude Code consumes it over stdio (see below). The launcher leaves that file untouched. Instead, the sibling shim `_http_launch.py` imports the server's `mcp` object and runs it on Streamable HTTP, with host and port set through the `FASTMCP_HOST` / `FASTMCP_PORT` env vars the stock `mcp[cli]` FastMCP reads.

The shim is a real file, not an inline `python -c`, on purpose: PowerShell's `Start-Process -ArgumentList` mangles a multi-statement `-c` string (the semicolon gets eaten and Python chokes on a bare `import`). The full rationale is in the header comment of `scripts/Start-DocumentInspector.ps1`.

Ports here (6290 / 6284 / 6287) differ from the memory server's Inspector launcher (6280 / 6274 / 6277) so **both** MCP demos run side by side without colliding.

## 2. Claude Code

`mcp_server.py` is registered in the repo-root [`.mcp.json`](../../.mcp.json) as **`oreilly-july20-documentmcp`** (stdio transport, spawned via `uv run --project mcp-example/mcp_cli mcp_server.py`). Launch `claude` from the **repo root** and Claude Code discovers this server automatically after a one-time approval prompt:

```powershell
claude mcp list   # confirm oreilly-july20-documentmcp is registered and connects
```

From then on Claude Code can call `read_doc_contents` / `edit_document`, read the `docs://` resources, and invoke the `format` prompt as part of a normal session. This is the Segment 4 "consume an MCP server" demo target.

## Note on the vendored chat client

This folder also ships `main.py` and `mcp_client.py` - a standalone chat REPL from the upstream Skilljar course. It is **not** the demo path for this repo; the Inspector and Claude Code above are. The client files are kept for reference fidelity with the source course, nothing more.
