# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

**Teaching/learning demo** of the **Model Context Protocol (MCP)** wired to the **Anthropic Python SDK**. A CLI chat front-end (`prompt_toolkit`) talks to **Claude** and routes tool calls, prompts, and resources through one or more MCP servers spawned as stdio subprocesses. The bundled server (`mcp_server.py`) exposes an in-memory document store; additional servers can be attached via `sys.argv`.

This is **demo-grade code**, not production. Several `# TODO:` markers in `mcp_server.py` and the commented-out stubs in `mcp_client.py` are intentional teaching scaffolds — preserve them when iterating unless explicitly asked to remove them.

The codebase was **adapted from Anthropic Academy's MCP courses** at https://anthropic.skilljar.com/ . See `README.md` for full attribution.

## MCP Primitives Matrix

What's wired and what isn't. Be honest with learners; cryptic JSON-RPC errors come from claiming support that doesn't exist.

| Primitive | Direction | Wired? | Where in code |
| --- | --- | --- | --- |
| **Tools** | client -> server | Yes | `mcp_server.py` `@mcp.tool`, `ToolManager` in `core/tools.py` |
| **Resources** | client reads from server | Yes | `mcp_server.py` `@mcp.resource`, `MCPClient.read_resource` |
| **Prompts** | server-defined templates | Yes | `mcp_server.py` `@mcp.prompt`, `/command` handling in `core/cli_chat.py` |
| **Sampling** | server -> client LLM | Yes | `summarize_via_sampling` tool, `_sampling_handler` in `main.py` |
| **Elicitation** | server -> user | Yes | `edit_document_safely`, `delete_document` tools; `_elicitation_handler` in `main.py` |
| **Roots** | client declares scope to server | Yes | `list_allowed_roots` tool, `_list_roots_handler` in `main.py` |
| **Logging notifications** | server -> client | No | Not yet wired; server log calls (`ctx.info`, `ctx.log`) silently drop |
| **Progress notifications** | server -> client | No | Not yet wired |

## Environment Setup

`.env` must define:

```
ANTHROPIC_API_KEY="..."
CLAUDE_MODEL="claude-haiku-4-5-20251001"   # Haiku for cost-efficient POC; bump to Sonnet 5 for live class
```

Both are asserted at startup in `main.py` and will hard-fail if missing. **Default for dev is Haiku 4.5** (~12x cheaper than Sonnet, ~3x cheaper than Opus, ~90% tool-routing accuracy). Switch to `claude-sonnet-5` or `claude-opus-4-8` when recording live demos where tool-selection determinism matters.

## Commands

| Task | Command |
| --- | --- |
| Install deps (uv, preferred) | `uv pip install -e .` |
| Run chat (uv) | `uv run main.py` |
| Run chat (plain Python) | `python main.py` |
| Run chat with raw JSON-RPC wire trace | `MCP_WIRE_TRACE=1 python main.py` (PowerShell: `$env:MCP_WIRE_TRACE=1; python main.py`) |
| Force uv subprocess for the MCP server | `USE_UV=1 python main.py` |
| Attach extra MCP servers | `uv run main.py path/to/other_server.py [more...]` |
| Smoke-test the MCP client alone | `uv run mcp_client.py` |
| Run the MCP server alone (stdio) | `uv run mcp_server.py` |

**Windows note:** `main.py` and `mcp_client.py` both set `WindowsProactorEventLoopPolicy` — required for stdio subprocess transport on Windows. Preserve those blocks.

**Project venv location:** `.venv\Scripts\python.exe` at the project root. When invoking uv from a tool harness that resolves cwd to the user home dir, pass explicit paths (e.g., `uv pip install --python "C:\path\to\.venv\Scripts\python.exe" -e "C:\path\to\project"`) — otherwise uv creates `.venv` in `C:\Users\<you>\` instead of the project.

No lint, type-check, or test suite is configured. Don't fabricate a `pytest` or `ruff` invocation.

## VS Code Launch Profiles

`.vscode/launch.json` defines five profiles. Pick by debugging need:

| Profile | When to use |
| --- | --- |
| **MCP: chat (normal run)** | Just run the demo, no debugger overhead |
| **MCP: chat (debug client)** | Set breakpoints in `main.py`, `mcp_client.py`, `core/*`. `justMyCode=false` lets you step into the SDK |
| **MCP: chat (wire-trace server)** | See every JSON-RPC frame in DEBUG CONSOLE plus `logs/mcp_wire_trace.log`. **This is the "under the hood" microscope** |
| **MCP: server only (debugpy)** | Set breakpoints inside `@mcp.tool` / `@mcp.prompt` function bodies |
| **MCP: server only (attach)** | Attach to a server you started externally with `python -m debugpy --listen 5678 --wait-for-client mcp_server.py` |

`.vscode/settings.json` pins the project venv as the default interpreter and excludes `.venv` and `logs/` from search.

## In-Chat UX

- **Plain text**: chats with Claude. Tools/prompts/resources from every connected MCP server are auto-discovered each turn.
- **`@<doc_id>`** (e.g. `@mcp-overview.md`): inlines that document's contents into the prompt as `<document>` context. Tab-completes from `docs://documents`.
- **`/<prompt_name> <doc_id>`** (e.g. `/format ckav1.35-objectives.pdf`): invokes an MCP **prompt** server-side. Tab-completes prompt names and doc IDs.
- **Meta-commands** (`:` prefix to avoid colliding with MCP `/prompts`): `:help`, `:docs`, `:prompts`, `:tools`, `:clear`, `:reset`, `:quit`. Defined in `core/cli.py`.

## Bundled Demo Corpus

The `docs` dict in `mcp_server.py` ships six audience-calibrated documents (2 `.md`, 2 `.pdf`, 1 `.docx`, 1 `.txt`). All are 150-250 words with embedded structure cues so the `/format` prompt produces real Markdown:

- `mcp-overview.md` — the four primitives plus sampling/elicitation/roots
- `azure-ai-foundry.pdf` — Foundry Agent Service primer
- `copilot-studio-faq.docx` — Copilot Studio vs Foundry, licensing, auth modes
- `ckav1.35-objectives.pdf` — CKA v1.35 (Feb 2025) domain weights
- `langgraph-hybrid-rag.md` — WARNERCO Schematica architecture
- `incident-runbook.txt` — on-call runbook for an MCP server outage

## Architecture (the part worth reading multiple files for)

Request flow on every user turn:

```
CliApp (core/cli.py)
  -> CliChat._process_query (core/cli_chat.py)        # routes /command vs @mention vs plain
       -> /command  : doc_client.get_prompt(...)          -> appends PromptMessages to history
       -> @mention  : doc_client.read_resource(...)       -> wraps doc content in <document> tags
       -> plain     : wraps query in a context-injected user prompt
  -> Chat.run (core/chat.py)                          # tool-use loop
       loop:
         Claude.chat(messages, tools=ToolManager.get_all_tools(clients))
         if stop_reason == "tool_use":
             ToolManager.execute_tool_requests(clients, response)   # finds owning client, calls tool
             append tool_result blocks as a user message, continue
         else:
             return text
```

Key invariants:

- **`Chat` is the tool-use loop; `CliChat` is the input-rewriting layer.** Don't put tool-loop logic in `CliChat` or input rewriting in `Chat`.
- **`ToolManager` is the only place that knows which client owns which tool** (`core/tools.py:_find_client_with_tool`). It scans every client's `list_tools()` on each call — fine for a demo, would need caching for scale.
- **Clients are keyed `doc_client` plus `client_{i}_{script}`** in `main.py`. `doc_client` is special: `CliChat` calls it directly for prompts and resources. Other servers contribute tools only.
- **MCP transport is always stdio.** `MCPClient` (`mcp_client.py`) spawns the server via `StdioServerParameters` and manages its lifecycle through an `AsyncExitStack`. The async-context-manager protocol on `MCPClient` is how lifetimes are tied to `main.py`'s outer `AsyncExitStack`.
- **Resource parsing assumes text content.** `MCPClient.read_resource` returns parsed JSON for `application/json` mime, raw string otherwise, and returns `None` for non-text resources. Adding binary resources requires extending that method.
- **PromptMessage -> MessageParam conversion** lives in `core/cli_chat.py`. It defensively handles both dict-shaped and object-shaped content because MCP SDK versions differ. Touch with care.

## Callback Registration Gotcha

**Sampling**, **elicitation**, and **roots** are **server-initiated** requests sent back to the client over the same stdio session. They look like "the server is calling the client" but the wire protocol is still one JSON-RPC stream.

The client MUST register a callback when constructing `ClientSession(...)`, or the server's request fails with JSON-RPC code `-32600` and a message like **"Sampling not supported"**, **"Elicitation not supported"**, or **"List roots not supported"**. The default callbacks in `mcp/client/session.py` return `ErrorData(code=INVALID_REQUEST)` — that's the exact error learners hit when they forget.

In this project, callbacks are accepted as kwargs on `MCPClient.__init__` (`mcp_client.py`) and threaded straight into `ClientSession(...)`. The actual handlers live in `main.py`: `_sampling_handler`, `_elicitation_handler`, `_list_roots_handler`. Adding a new server-initiated primitive means adding a kwarg in both places.

## Roots Scheme Gotcha

`mcp.types.Root.uri` is typed as `FileUrl`, which enforces the `file://` scheme. Custom schemes like `docs://` raise `pydantic_core.ValidationError: URL scheme should be 'file'`. The demo works around this by publishing the in-memory document namespace as a virtual `file:///.../docs` path and using the `DOCS_ROOT_MARKER = "/docs"` sentinel in `mcp_server.py` to tail-match URIs in the roots gate. If you wire a new server that needs roots, do the same.

## Destructive Tool Pattern

Two tools demonstrate the production-realistic shape of destructive operations:

- **`edit_document_safely`** — boolean-confirm elicitation. Gated by the roots check (won't run unless the client declared a `/docs` root). Graceful degradation: if the client doesn't support roots, the gate is skipped with a `ctx.info` log.
- **`delete_document`** — **typed-confirmation** elicitation (must retype the exact `doc_id`, mirroring the GitHub repo-deletion UX). Same roots gate. Supports **soft-delete** (default — moves to in-memory `_trash` dict, observable via `docs://trash` resource) and **hard-delete** (`hard_delete: true` in the schema). Idempotent on already-deleted docs.

The pattern to copy for new destructive ops: typed-confirmation > boolean-confirm > no confirmation; soft-delete by default; share the same roots-gate code path so authorization stays uniform.

## JSON-RPC Wire Trace

`scripts/mcp_wire_trace.py` is a stdio proxy. Set `MCP_WIRE_TRACE=1` (or pick the matching VS Code launch profile) and `main.py` will spawn the proxy in place of `mcp_server.py`. The proxy logs every JSON-RPC frame in both directions to stderr and to `logs/mcp_wire_trace.log` with timestamps, direction (`C->S` / `S->C`), and pretty-printed JSON.

This is the **teaching microscope**: when a learner asks "what actually goes over the wire when I call `/format`, or when the server triggers sampling, or when elicitation pauses for input?" — open the wire log.

The proxy uses a threaded blocking reader for parent-process stdin because wrapping `sys.stdin` as an asyncio stream on the Windows `ProactorEventLoop` fails with `WinError 6`. Child server pipes (from `create_subprocess_exec`) are real OS pipes and stay on the event loop. Preserve this split if you refactor.

## Common Edit Points

- **Add a document:** edit the `docs` dict in `mcp_server.py`. No restart of the chat is needed beyond re-running `main.py` (the server is a child process).
- **Add a tool / prompt / resource:** decorate a function in `mcp_server.py` with `@mcp.tool` / `@mcp.prompt` / `@mcp.resource`. It's auto-discovered on the next client connect.
- **Wire in a second MCP server:** pass its script path as a CLI arg to `main.py`. It will be spawned via `uv run <script>`.
- **Demo sampling:** call `summarize_via_sampling` — the server delegates generation to the client's LLM via `_sampling_handler` in `main.py`. Watch for the `🔁  [sampling]` line in stdout to confirm the round-trip fired.
- **Demo elicitation (simple):** call `edit_document_safely` — the server pauses on `ctx.elicit(...)` and `_elicitation_handler` prompts the user at the terminal for each field in the schema.
- **Demo elicitation (typed):** call `delete_document` — same handler but with a richer schema (retype the doc_id, optional reason, hard-delete flag).
- **Demo roots:** call `list_allowed_roots` — the server reads the client's declared roots via `ctx.session.list_roots()`, which routes to `_list_roots_handler`.
- **Inspect the wire:** run with `MCP_WIRE_TRACE=1`, then `tail -f logs/mcp_wire_trace.log`.

## Gotchas

- `core/tools.py` has a latent bug in the `execute_tool_requests` `except` block: it references `tool_output` which may be unbound if `call_tool` raised before assignment. Worth a fix if you're already in that file — don't drive-by without flagging it.
- `Claude.chat` uses mutable default `stop_sequences=[]` (`core/claude.py`). Cosmetic for a demo, real footgun in production.
- The MCP server runs at `log_level="ERROR"` (`mcp_server.py`); bump to `DEBUG` when debugging protocol issues.
- **Forgetting to register `sampling_callback` / `elicitation_callback` / `list_roots_callback` on `ClientSession`** is the #1 reason "supported" primitives fail with cryptic JSON-RPC errors. Always grep `mcp_client.py:__init__` first when debugging a `-32600` / "not supported" failure — odds are the kwarg never made it to the session constructor.
- **Don't trust `uv venv` to land in the project directory** when running under a tool harness whose cwd resolves to the user home dir. Always pass explicit `--python` and target paths.

Next Best Steps:
1) Run `uv run main.py` and exercise `@mcp-overview.md`, `/format ckav1.35-objectives.pdf`, `list_allowed_roots`, then `delete_document` against any doc to see typed-confirmation elicitation in action.
2) Add `tests/test_mcp_contract.py` (pytest) that asserts the full tool set, roots gate, elicitation paths, and `docs://trash` lifecycle. The current verification is one-shot smoke; promote it to CI before the next model swap.
3) Wire logging notifications (`ctx.info` / `ctx.log`) end-to-end so server-side log lines stream into the chat UI. Closes one of two remaining gaps in the primitives matrix.
