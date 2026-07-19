# MCP Game-Day Runbook

Dead-simple start / restart / stop for the Claude Code MCP servers in this repo.
Copy-paste, no flailing. Open this file in a split pane while you teach.

## What is wired (and where)

Project MCP servers are declared in **`.mcp.json`** at the repo root (the file the
Claude Code CLI reads for project scope). Three servers:

| Server | Transport | What it is | Needs |
|--------|-----------|------------|-------|
| **microsoft-learn** | HTTP | Microsoft Learn docs search (Segment 4 consume demo) | internet |
| **DocumentMCP-ClaudeCode** | stdio | The teaching kit (tools, resources, prompts, sampling, elicitation, roots) | `uv`, the `mcp-teaching-kit-main/` project |
| **github** | HTTP | GitHub tooling for Segment 3/4 PR demos | `GITHUB_TOKEN` env var |

The **memory server** (`segment_4_hero/memory_server/`) is **optional homework**, not
pre-wired. Its start/stop is at the bottom.

## Pre-flight (already done, verify in 5 seconds)

All three servers are **pre-approved**, so they connect the moment you launch `claude`
in this repo - no approval prompt on game day. Confirm:

```bash
claude mcp list
```

You want to see all three with **✔ Connected**:

```
microsoft-learn: ... - ✔ Connected
DocumentMCP-ClaudeCode: ... - ✔ Connected
github: ... - ✔ Connected
```

If instead you see **⏸ Pending approval**, run the one-time fix in "Restart" below.

## START

There is nothing to "start" for the HTTP servers - they are always-on endpoints.
The stdio server (**DocumentMCP-ClaudeCode**) is spawned automatically by Claude Code
when you launch a session in this repo:

```bash
cd /c/github/claude-code
claude
```

Inside the session, browse the live servers any time:

```
/mcp
```

## RESTART

There is no `claude mcp restart` command. To restart the servers, do one of these
(fastest first):

**1. Relaunch the session** (restarts the stdio server cleanly):

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
claude mcp remove DocumentMCP-ClaudeCode
claude mcp add DocumentMCP-ClaudeCode -- uv run --project ./mcp-teaching-kit-main ./mcp-teaching-kit-main/mcp_server.py
```

## STOP

The stdio server stops on its own when you exit the Claude Code session
(Ctrl+D or `/exit`) - it is a child process, so quitting Claude Code kills it.
The HTTP servers are remote endpoints; there is nothing local to stop.

To make a server **stop loading entirely** (so it does not spawn next launch):

```bash
claude mcp remove DocumentMCP-ClaudeCode   # removes it from your approved set
# Re-add later with the command in Restart option 3.
```

## Optional: the memory server (Segment 4 build-your-own homework)

Not pre-wired. Only touch this if you are demoing the build-your-own path.

**Start (registers it, then it spawns on next launch):**

```bash
claude mcp add memory -- bash segment_4_hero/memory_server/start.sh
claude mcp list        # confirm "memory" appears
```

**Restart:** relaunch `claude`, or `claude mcp remove memory` then the add command above.

**Stop:** `claude mcp remove memory`

**Test it boots standalone** (sanity check before class):

```bash
cd segment_4_hero/memory_server
uv run python server.py     # Ctrl+C to stop; you want "Starting MCP server 'memory' ... stdio"
```

## 30-second panic checklist

1. `claude mcp list` - are the three servers **✔ Connected**?
2. Not connected / Pending? -> `claude mcp reset-project-choices` then `claude`, accept once.
3. `DocumentMCP` failing? -> `cd mcp-teaching-kit-main && uv sync`, then relaunch `claude`.
4. `github` failing? -> confirm `GITHUB_TOKEN` is set in your shell, then relaunch.
5. Still stuck? Drop the server from the demo and keep teaching; `microsoft-learn` alone
   carries the Segment 4 consume story.
