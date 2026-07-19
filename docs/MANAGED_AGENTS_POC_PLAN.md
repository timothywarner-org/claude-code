# Python POC: Anthropic Messages API + Managed Agents API

Implementation plan for a Python console application that showcases both the
**Messages API** (stable tool-use loop) and the **Managed Agents API** (beta
hosted-loop surface) behind a single REPL.

## Context

Tim wants a Python console POC that demonstrates both APIs side by side. Target
scope: **more than a toy, less than enterprise software**. The deliverable is a
teaching artifact for the O'Reilly *Claude Code and Large-Context Reasoning*
course (Segment 4, "Hero" territory). It needs to be small enough to read
end-to-end in one sitting, but realistic enough that learners can see what each
API actually buys them.

The repo already has Python under `src/` (declares `anthropic>=0.51.0` in
`pyproject.toml`, UV-managed, Python 3.10+) and a working `prompt_toolkit` REPL
pattern in `mcp-teaching-kit-main/core/cli.py`. No Managed Agents code exists
yet anywhere in the repo. This POC fills that gap.

**Why this matters for the course.** Segment 4 teaches *consuming* agentic
primitives. Learners need a runnable, instrumented example that shows both the
loop-it-yourself path (Messages + tools) and the let-Anthropic-host-the-loop
path (Managed Agents beta) side by side, so they can feel the trade-off.

## Recommended Approach

Build a single REPL app at `src/managed_agents_poc/` with two switchable
backends:

1. **`messages` backend.** Classic tool-use loop using `client.messages.create()`,
   streaming output, with 2-3 local tools registered.
2. **`agents` backend.** Beta path using `client.beta.agents.create()` and
   `client.beta.sessions` for a hosted-loop equivalent.

The REPL lets the user flip backends at runtime with `/backend messages` or
`/backend agents`, swap models with `/model`, toggle streaming with `/stream`,
and list registered tools with `/tools`. Same conversation transcript, two
execution paths. That side-by-side comparison is the teaching moment.

### Layout

```text
src/managed_agents_poc/
  pyproject.toml          # UV-managed, declares anthropic, prompt_toolkit, python-dotenv, rich
  README.md               # 1-page quickstart
  .env.example            # ANTHROPIC_API_KEY, CLAUDE_MODEL, optional ANTHROPIC_ENVIRONMENT_ID/KEY
  app.py                  # entry point: `uv run python app.py`
  cli.py                  # prompt_toolkit REPL, slash command dispatch
  backends/
    __init__.py
    base.py               # ABC: send(messages) -> stream of events
    messages_backend.py   # Messages API + local tool-use loop
    agents_backend.py     # beta.agents + beta.sessions wrapper
  tools/
    __init__.py
    registry.py           # @tool decorator, name->callable map, JSON schema via pydantic
    file_read.py          # safe file read with size cap, restricted to CWD
    calculator.py         # arithmetic eval (ast-based, not eval())
    word_count.py         # text stats, trivial third tool to show registry scaling
  console.py              # rich.Console wrapper for colored output (no red/green-only signaling)
```

### Key Design Choices

- **Two backends behind one ABC.** Lets the REPL stay backend-agnostic and lets
  learners diff `messages_backend.py` against `agents_backend.py` to see
  exactly what Managed Agents hides for you. Reference:
  `mcp-teaching-kit-main/core/claude.py` already wraps `client.messages.create`
  cleanly. Mirror that style.
- **Local tool-use loop in `messages_backend.py`.** Follows the canonical
  pattern: assistant turn, if `stop_reason == "tool_use"`, dispatch each
  `tool_use` block through `tools/registry.py`, append `tool_result` blocks,
  re-send. Stream via `client.messages.stream()` so learners see tokens land in
  real time.
- **Managed Agents path uses the beta SDK surface.**
  `client.beta.agents.create(...)` runs once at startup (or reuses an
  `agent_id` from env), then `client.beta.sessions.create(agent_id=...)` per
  conversation. Per the SDK docs, these endpoints are
  `POST /v1/agents?beta=true` and `POST /v1/sessions?beta=true`. Fall back
  gracefully with a clear error if `ANTHROPIC_ENVIRONMENT_ID` is missing. The
  beta path is opt-in.
- **`tools/registry.py`.** Uses a `@tool` decorator that introspects the
  function signature via `pydantic` to auto-generate the JSON schema. Saves
  boilerplate. Three starter tools (file read, calculator, word count) prove
  the registry works for more than one tool shape.
- **`rich.Console` for output** with shape and label-based differentiation:
  `[tool]`, `[assistant]`, `[error]` prefixes. No color-only signaling, per
  the accessibility rule.
- **`prompt_toolkit` REPL with slash commands.** Mirrors the existing repo
  pattern in `mcp-teaching-kit-main/core/cli.py`. Custom completer for
  `/backend`, `/model`, `/tools`, `/stream`, `/clear`, `/exit`.
- **PowerShell-friendly.** `.env.example` ships with Windows path examples.
  `app.py` is `python -m` runnable so no shebang or permission issues on
  Windows 11.

### Slash Commands

| Command                       | Effect                                           |
| ----------------------------- | ------------------------------------------------ |
| `/backend messages \| agents` | Switch execution backend mid-session             |
| `/model <id>`                 | Override `CLAUDE_MODEL` for the next turn        |
| `/stream on \| off`           | Toggle streaming output                          |
| `/tools`                      | List registered tools and their schemas          |
| `/clear`                      | Reset conversation history                       |
| `/exit`                       | Quit                                             |

### What This POC Deliberately Does NOT Do

- No `EnvironmentWorker` or `tool_runner` polling loop. The helper docs show
  this exists, but it is overkill for a console demo.
- No MCP server registration. Segment 4 already has `memory_server/` for that.
- No persistence across runs. Conversation lives in memory.
- No `web_search` or `code_execution` server tools. Kept to local tools so
  learners can see every byte that crosses the wire.

### Critical Files to Reuse or Reference

- `mcp-teaching-kit-main/core/claude.py`. Client construction pattern,
  message-create wrapper style.
- `mcp-teaching-kit-main/core/cli.py`. `prompt_toolkit` REPL with custom
  completer and key bindings.
- `mcp-teaching-kit-main/.env.example`. Env var hard-fail assertion pattern.
- `src/pyproject.toml`. UV plus hatchling layout, Python 3.10+ baseline.

### Real-World Feel (No foo, bar, baz)

Default conversation starter and tool examples will use realistic content: a
code-review prompt against a file in the repo, a unit-conversion calculator
request, a word-count on a README. No placeholder data anywhere.

## Verification

End-to-end smoke test (run in `src/managed_agents_poc/`):

1. `uv sync`. Installs dependencies.
2. Copy `.env.example` to `.env`, set `ANTHROPIC_API_KEY`.
3. `uv run python app.py`. REPL starts.
4. Prompt: `Summarize the file README.md in three bullets.` Confirm the
   `file_read` tool fires and output streams.
5. `/backend agents`. Requires `ANTHROPIC_ENVIRONMENT_ID` set, otherwise expect
   a clear error message.
6. Repeat the prompt. Confirm the same answer shape via the Managed Agents
   path.
7. `/tools`. Confirm all three tools list with their JSON schemas.
8. `/model claude-haiku-4-5-20251001`, then ask a trivial question. Confirm
   the model swap took effect by inspecting the usage block.
9. Manual error case: ask the file tool to read a path outside CWD. Confirm
   graceful refusal, not a crash.

No automated tests are in scope for the POC. If pytest coverage is wanted
later, the ABC in `backends/base.py` makes mocking trivial.

## Next Best Steps

1. Approve this plan or redline any of the design choices (especially the
   beta Managed Agents fallback behavior).
2. Drop a quick CONTRIBUTING note in `src/managed_agents_poc/README.md` once
   built, so the POC slots cleanly into the Segment 4 narrative.
3. Once stable, promote one screenshot of the side-by-side backend swap into
   the course slide deck. That A/B is the whole point of the demo.
