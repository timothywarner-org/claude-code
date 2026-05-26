# MCP Chat

MCP Chat is a command-line chat application that talks to Anthropic's Claude models and routes tool calls, prompts, and resources through one or more **Model Context Protocol (MCP)** servers. The bundled server (`mcp_server.py`) exposes an in-memory document corpus and demonstrates every major MCP primitive: **tools**, **resources**, **prompts**, **sampling**, **elicitation**, and **roots**.

*Adapted from [Anthropic Academy](https://anthropic.skilljar.com/), see [Attribution & Credits](#attribution--credits) for details.*

## Prerequisites

- Python 3.10+
- An Anthropic API key

## Setup

### Step 1: Configure environment variables

Create a `.env` file in the project root with both keys set:

```
ANTHROPIC_API_KEY="sk-ant-..."          # your Anthropic API secret
CLAUDE_MODEL="claude-haiku-4-5-20251001" # Haiku for cost-efficient POC work
```

Both are asserted at startup and the app will refuse to run if either is missing.

**Model choice:** Haiku 4.5 is the default for development because it is roughly 12 times cheaper than Sonnet for this workload while preserving about 90 percent of tool-routing accuracy. Switch to `claude-sonnet-4-6` or `claude-opus-4-7` when recording live demos where tool-selection determinism matters more than per-token cost.

### Step 2: Install dependencies

#### Option 1: Setup with uv (Recommended)

[uv](https://github.com/astral-sh/uv) is a fast Python package installer and resolver.

1. Install uv, if not already installed:

```bash
pip install uv
```

2. Create and activate a virtual environment:

```bash
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:

```bash
uv pip install -e .
```

4. Run the project:

```bash
uv run main.py
```

#### Option 2: Setup without uv

1. Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -e .
```

3. Run the project:

```bash
python main.py
```

## Usage

### Basic interaction

Type your message and press Enter to chat with the model. The CLI prints a banner, a status row, and a meta-command menu on launch.

### Meta-commands (in-app navigation)

Meta-commands use the `:` prefix so they do not collide with MCP server `/prompts`:

| Command | Action |
| --- | --- |
| `:help` | Show the menu |
| `:docs` | List documents exposed by the MCP server |
| `:prompts` | List slash-prompts exposed by the MCP server |
| `:tools` | List tools across every connected MCP server |
| `:clear` | Clear the screen |
| `:reset` | Wipe chat history and start fresh |
| `:quit` | Exit (Ctrl+C also works) |

### Document retrieval

Use the `@` symbol followed by a document ID to inline a document into your prompt as `<document>` context:

```
> Tell me about @mcp-overview.md
```

Tab completion is wired against the live `docs://documents` resource.

### Server-defined prompts

Use the `/` prefix to invoke an MCP **prompt** registered by the server. The bundled server exposes `/format` which rewrites a document into Markdown:

```
> /format ckav1.35-objectives.pdf
```

Prompts and their arguments auto-complete on Tab.

### Bundled demo corpus

The server ships six audience-calibrated documents (two `.md`, two `.pdf`, one `.docx`, one `.txt`), each substantive enough for the `/format` prompt to produce real Markdown:

- `mcp-overview.md` — the MCP primitives at a glance
- `azure-ai-foundry.pdf` — Foundry Agent Service primer
- `copilot-studio-faq.docx` — Copilot Studio vs Foundry, licensing, auth
- `ckav1.35-objectives.pdf` — CKA v1.35 domain weights
- `langgraph-hybrid-rag.md` — WARNERCO Schematica pipeline overview
- `incident-runbook.txt` — on-call runbook example

### Demonstrating the four advanced primitives

| Primitive | How to trigger | What to watch for |
| --- | --- | --- |
| **Tools** | Ask the model anything that needs `read_doc_contents` or `edit_document` | Standard tool-use loop |
| **Resources** | `@mcp-overview.md` or `:docs` | Resource read with no LLM round trip |
| **Prompts** | `/format ckav1.35-objectives.pdf` | Server-supplied prompt template |
| **Sampling** | "Use the sampling tool to summarize azure-ai-foundry.pdf" | Server delegates generation back to the client's Claude. `[sampling]` marker prints in the terminal |
| **Elicitation (boolean)** | "Safely edit copilot-studio-faq.docx and change X to Y" | Server pauses, terminal prompts for confirmation |
| **Elicitation (typed)** | "Delete plan.md" or "Delete azure-ai-foundry.pdf" | Server requires you to retype the doc_id; supports soft-delete (default) and hard-delete |
| **Roots** | "Call list_allowed_roots" | Server reads the client's declared filesystem scope |

## Debugging and "under the hood"

### See the raw JSON-RPC frames

Set `MCP_WIRE_TRACE=1` to route stdio through a proxy that logs every frame:

```bash
# bash
MCP_WIRE_TRACE=1 python main.py

# PowerShell
$env:MCP_WIRE_TRACE = "1"; python main.py
```

Frames are mirrored to stderr and to `logs/mcp_wire_trace.log` with timestamps, direction (`C->S` or `S->C`), method names, and pretty-printed JSON bodies. The previous run is preserved as `logs/mcp_wire_trace.prev.log` for side-by-side comparison.

### VS Code launch profiles

`.vscode/launch.json` defines five profiles for different debugging needs:

| Profile | Purpose |
| --- | --- |
| **MCP: chat (normal run)** | Run the demo with no debugger overhead |
| **MCP: chat (debug client)** | Break into `main.py`, `mcp_client.py`, and the MCP SDK itself |
| **MCP: chat (wire-trace server)** | Stream every JSON-RPC frame to the DEBUG CONSOLE |
| **MCP: server only (debugpy)** | Break inside `@mcp.tool` and `@mcp.prompt` function bodies |
| **MCP: server only (attach)** | Attach to a server launched externally on port 5678 |

`.vscode/settings.json` pins the project venv as the default Python interpreter.

## Development

### Adding new documents

Edit the `docs` dict in `mcp_server.py`. New entries are picked up on the next restart of the chat client.

### Adding tools, prompts, or resources

Decorate a function in `mcp_server.py` with `@mcp.tool`, `@mcp.prompt`, or `@mcp.resource`. The client auto-discovers everything on session init.

### Implementing the unfinished MCP features

The `# TODO:` markers at the top of `mcp_server.py` and the commented-out stubs in `mcp_client.py` are intentional teaching scaffolds adapted from the Anthropic Academy source material. Treat them as exercises rather than work items unless you are explicitly reworking the demo.

### Linting and type checks

There are no lint or type checks configured in this repository.

## Attribution & Credits

The MCP server and client code in this repository was **adapted from [Anthropic Academy](https://anthropic.skilljar.com/)**, specifically the two courses on the **Model Context Protocol** (MCP). The original course material, including the foundational structure of `mcp_server.py`, `mcp_client.py`, and the chat loop in `main.py`, is the work of **Anthropic** and its instructors.

Tim Warner has adapted this material to serve as teaching content for the O'Reilly Live Training course **"Context Engineering with MCP"** and related Pluralsight work. Adaptations in this fork include:

- A richer CLI experience, with a startup banner and interactive meta-commands.
- Full implementations of the MCP **sampling**, **elicitation**, and **roots** primitives, beyond the original focus on tools, resources, and prompts.
- A `delete_document` tool that demonstrates **typed-confirmation** elicitation (retype the doc_id, GitHub-style) plus soft-delete and hard-delete semantics with a recoverable `docs://trash` resource.
- A JSON-RPC wire-trace proxy (`scripts/mcp_wire_trace.py`) and matching VS Code launch profiles so learners can see the raw protocol in real time.
- Updated reference documents and examples calibrated for a **Microsoft**, **Azure**, and **Pluralsight** learner audience.

Thank you to Anthropic and the Anthropic Academy team for publishing the source material that made this teaching artifact possible.
