# MCP Game-Day Runbook

Dead-simple start / restart / stop for the Claude Code MCP servers in this repo.
Copy-paste, no flailing. Open this file in a split pane while you teach.

## What is wired (and where)

Project MCP servers are declared in **`.mcp.json`** at the repo root (the file the
Claude Code CLI reads for project scope). **Four servers**, all pre-registered:

| Server | Transport | What it is | Needs |
|--------|-----------|------------|-------|
| **microsoft-learn** | HTTP | Microsoft Learn docs search (Segment 4 consume demo) | internet |
| **oreilly-july20-documentmcp** | stdio | Simple in-memory DocumentMCP server (tools `read_doc_contents` / `edit_document`, `docs://` resources, a `format` prompt) | `uv`, the `mcp-example/mcp_cli` project |
| **oreilly-july20-memorymcp** | stdio | FastMCP memory server, 9 tools | `uv`, the `segment_4_hero/memory_server` project |
| **github** | HTTP | GitHub tooling for Segment 3/4 PR demos | `GITHUB_TOKEN` env var |

All four are pre-wired. There is no separate optional-homework step for the memory
server anymore. It is now a first-class registered server.

## Pre-flight (already done, verify in 5 seconds)

All four servers are **pre-approved**, so they connect the moment you launch `claude`
in this repo. No approval prompt on game day. Confirm:

```bash
claude mcp list
```

You want to see all four with **✔ Connected**:

```
microsoft-learn: ... - ✔ Connected
oreilly-july20-documentmcp: ... - ✔ Connected
oreilly-july20-memorymcp: ... - ✔ Connected
github: ... - ✔ Connected
```

If instead you see **⏸ Pending approval**, run the one-time fix in "Restart" below.

## START

There is nothing to "start" for the HTTP servers - they are always-on endpoints.
The two stdio servers (**oreilly-july20-documentmcp** and **oreilly-july20-memorymcp**)
are spawned automatically by Claude Code when you launch a session in this repo:

```bash
cd /c/github/claude-code
claude
```

Inside the session, browse the connected servers any time:

```
/mcp
```

## RESTART

There is no `claude mcp restart` command. To restart the servers, do one of these
(fastest first):

**1. Relaunch the session** (respawns the stdio servers cleanly):

```bash
# Quit Claude Code (Ctrl+D or type /exit), then:
claude
```

**2. If a server shows "Pending approval" and will not connect**, re-approve:

```bash
claude mcp reset-project-choices   # clears approvals for this project
claude                             # relaunch; accept the approval prompt once
```

**3. Full re-add of a single stdio server** (nuclear option, rarely needed):

```bash
# DocumentMCP:
claude mcp remove oreilly-july20-documentmcp
claude mcp add oreilly-july20-documentmcp -- uv run --project ./mcp-example/mcp_cli ./mcp-example/mcp_cli/mcp_server.py

# Memory:
claude mcp remove oreilly-july20-memorymcp
claude mcp add oreilly-july20-memorymcp -- uv run --project ./segment_4_hero/memory_server ./segment_4_hero/memory_server/server.py
```

## STOP

Each stdio server stops when you exit the Claude Code session (Ctrl+D or `/exit`).
Each is a child process, so quitting Claude Code kills it. The HTTP servers are remote
endpoints; there is nothing local to stop.

To make a server **stop loading entirely** (so it does not spawn next launch):

```bash
claude mcp remove oreilly-july20-documentmcp   # or oreilly-july20-memorymcp
# Re-add later with the matching command in Restart option 3.
```

## Inspect a server in the browser

Each stdio server has a PowerShell Inspector launcher in `scripts/`. Each launcher
frees its ports, starts the server on HTTP, waits for the bind, then opens the
standalone MCP Inspector.

| Server | Launcher | Ports (server / UI / proxy) |
|--------|----------|-----------------------------|
| **oreilly-july20-documentmcp** | `scripts/Start-DocumentInspector.ps1` | 6290 / 6284 / 6287 |
| **oreilly-july20-memorymcp** | `scripts/Start-MemoryInspector.ps1` | 6280 / 6274 / 6277 |

Run with `-NoAuth` (tokenless local class mode):

```powershell
# DocumentMCP:
& 'C:\github\claude-code\scripts\Start-DocumentInspector.ps1' -NoAuth

# Memory:
& 'C:\github\claude-code\scripts\Start-MemoryInspector.ps1' -NoAuth
```

In the Inspector UI: **Transport = Streamable HTTP**, then set the **URL** to the
server port and connect:

- DocumentMCP: `http://127.0.0.1:6290/mcp`
- Memory: `http://127.0.0.1:6280/mcp`

## 30-second panic checklist

1. `claude mcp list` - are all **four** servers **✔ Connected**?
2. Not connected / Pending? -> `claude mcp reset-project-choices` then `claude`, accept once.
3. `oreilly-july20-documentmcp` failing? -> `cd mcp-example/mcp_cli && uv sync`, then relaunch `claude`.
4. `oreilly-july20-memorymcp` failing? -> `cd segment_4_hero/memory_server && uv sync`, then relaunch `claude`.
5. `github` failing? -> confirm `GITHUB_TOKEN` is set in your shell, then relaunch.
6. Still stuck? Drop the server from the demo and keep teaching; `microsoft-learn` alone
   carries the Segment 4 consume story.
