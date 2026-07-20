# mcp-example/

`mcp_cli/mcp_server.py` is a **simple in-memory DocumentMCP** server, vendored from Anthropic's Skilljar course and kept here as a minimal MCP demo target. It holds a handful of in-memory documents and exposes them through the three MCP primitives:

| Primitive | Name | What it does |
|-----------|------|--------------|
| Tool | `read_doc_contents` | Read a document by id |
| Tool | `edit_document` | Replace a string inside a document |
| Resource | `docs://documents` | List all document ids |
| Resource | `docs://documents/{doc_id}` | Fetch one document's contents |
| Prompt | `format` | Rewrite a document in Markdown |

It is its own **separate uv project** (own `pyproject.toml`, `uv.lock`, `.python-version` pinned to 3.13). Two ways to exercise it: the **MCP Inspector** and **Claude Code**.

## 1. MCP Inspector (the browser UI)

The on-rails, idempotent launcher starts the server on **Streamable HTTP** and opens the Inspector for you:

```powershell
.\scripts\Start-DocumentInspector.ps1 -NoAuth
```

It force-frees its ports, starts the server on port **6290**, waits for it to bind, then opens the standalone Inspector (UI **6284**, proxy **6287**). After a reboot or a half-dead session, that one command brings the whole demo back. In the Inspector: **Transport = Streamable HTTP**, **URL = `http://127.0.0.1:6290/mcp`**, **Connect**.

Ports (6290 / 6284 / 6287) differ from the memory server's Inspector launcher (6280 / 6274 / 6277) on purpose, so **both** MCP demos run side by side with no collision. See [`mcp_cli/README.md`](mcp_cli/README.md) for the design notes.

## 2. Claude Code

`mcp_server.py` is registered in the repo-root [`.mcp.json`](../.mcp.json) as **`oreilly-july20-documentmcp`** (stdio transport, spawned via `uv run --project mcp-example/mcp_cli mcp_server.py`). Launch `claude` from the repo root and Claude Code discovers this server automatically after a one-time approval prompt, then can call its tools, read its resources, and invoke its `format` prompt. This is the Segment 4 "consume an MCP server" demo target.

```powershell
claude mcp list   # confirm oreilly-july20-documentmcp is registered
```

See [`mcp_cli/NOTICE.md`](mcp_cli/NOTICE.md) for attribution.
