# When CLAUDE.md is Not Enough: MCP for Reach

<!-- src: MCP spec 2025-11-25 - current stable as of May 2026 -->
<!-- Time budget: 25 minutes (advanced sub-segment, segment closer) -->

## Cold open

Your `CLAUDE.md` tells Claude **how your codebase works**. It doesn't tell Claude **what changed in Azure last week**. For that you need **MCP** - a standard way for Claude to reach into a live external system and pull context on demand.

Three CLAUDE.md files at three scopes (project, user, subdirectory) get you a long way. They cover **conventions, decisions, scope-specific overrides**. They don't cover:

- "What is the current Azure AKS API version?"
- "What does GitHub Issue #4382 say right now?"
- "What is in the Postgres `users` table on staging?"

Those answers live **outside the conversation**. MCP is how Claude reaches them without you copy-pasting.

## The mental model

**MCP (Model Context Protocol)** is an open spec - current version **2025-11-25** - that lets Claude talk to external **servers** over one of two standard transports:

| Transport | When it fits | How it works |
|-----------|--------------|--------------|
| **stdio** | Local tools, dev laptops, single-user | Client spawns the server as a child process. JSON-RPC over stdin/stdout. Logs go to stderr. |
| **Streamable HTTP** | Remote/shared servers, multi-user | Client POSTs JSON-RPC to `/mcp`. Server returns 202 for notifications, 200 with JSON or SSE for requests. Must return 403 on invalid `Origin`. |

> The older **SSE-only transport is retired** in MCP 2025-11-25. If a server only offers SSE, it is out of spec. Streamable HTTP replaces it.

An MCP server exposes **three primitives**, mirroring the same control hierarchy as skills:

| Primitive | Who controls it | What it does | Skills analog |
|-----------|----------------|--------------|----------------|
| **Tools** | Model-controlled (Claude decides when to call) | Side-effecting actions: query a DB, send a Slack message, hit an API | Auto-invoked skill |
| **Resources** | App-controlled (CLI loads on demand) | Read-only data: file contents, schema, current state | Skill with dynamic context injection |
| **Prompts** | User-controlled (you trigger with `/`) | Templates the server provides for you to invoke | Slash-invoked skill |

Today you **consume** MCP servers. Building one is optional homework - the course ships a working Python FastMCP example at `segment_4_hero/memory_server/` for learners who want to go that deep.

## Reach hierarchy: where MCP fits

```
┌─────────────────────────────────────────────────────────────────┐
│  Project CLAUDE.md            ← Repo-specific conventions       │
│  ├─ User CLAUDE.md            ← Your personal standards         │
│  └─ Subdirectory CLAUDE.md    ← Path-scoped overrides           │
│                                                                 │
│  Skills (.claude/skills/)     ← Reusable local workflows        │
│  Subagents (.claude/agents/)  ← Isolated, parallel reasoning    │
│                                                                 │
│  ━━━━━━━━━━━ end of the local memory spine ━━━━━━━━━━           │
│                                                                 │
│  MCP servers                  ← Reach OUT to live systems       │
│   ├─ stdio: local tools                                         │
│   └─ Streamable HTTP: remote services                           │
└─────────────────────────────────────────────────────────────────┘
```

When everything above the line isn't enough, MCP is the next step.

## Consuming an already-registered server

This repo's `.mcp.json` (repo root) registers **microsoft-learn** as a Streamable HTTP server pointing at `https://learn.microsoft.com/api/mcp`. You didn't install it. You didn't run it. It's already wired up. To see it:

```bash
claude mcp list
```

You should see a line for `microsoft-learn` (HTTP transport). Inside a session, the slash command `/mcp` opens the server browser - pick `microsoft-learn` and you will see its tools, resources, and prompts.

The server exposes three tools:

| Tool | Returns | Use when |
|------|---------|----------|
| `microsoft_docs_search` | Up to 10 doc chunks (max 500 tokens each), with title + URL + excerpt | Breadth: "give me the lay of the land" |
| `microsoft_code_sample_search` | Up to 20 official code samples (optional `language` filter) | Practical code: "show me a working example" |
| `microsoft_docs_fetch` | Full doc page as markdown | Depth: "I need the whole tutorial" |

Search gives breadth. Code Sample Search gives practical examples. Fetch gives depth. Same pattern most production MCP servers follow.

## CLI cheat sheet

```bash
# List configured servers (across project, user, plugin scopes)
claude mcp list

# View tools/resources/prompts inside a session
claude /mcp

# Add a server via CLI (stdio)
claude mcp add memory -- bash segment_4_hero/memory_server/start.sh

# Add a server via CLI (Streamable HTTP)
claude mcp add-json learn '{"type":"http","url":"https://learn.microsoft.com/api/mcp"}'

# Debug transport issues
claude --mcp-debug
```

## The demo

Walkthrough in `demos/segment_4_hero_punchlist.md` - Step 3 covers MCP consumption end to end, including a real Microsoft Learn query.

## Try it now

Five-minute exercise:

1. Open Claude Code in this repo: `claude`
2. Type `/mcp` and explore the `microsoft-learn` server. Note the three tools.
3. Ask Claude a question that **requires** the server, for example:

   ```
   What is the current GA version of the Azure Kubernetes Service API, and what changed in the most recent release? Use the microsoft-learn MCP server.
   ```

4. Watch Claude call `microsoft_docs_search`, then optionally `microsoft_docs_fetch` for depth. Notice the URLs and titles in the response - those came from outside your conversation.
5. Try the same question **without** asking Claude to use the server. Compare what you get from training data alone.

That second comparison is the whole point. MCP is the difference between "what Claude memorized at training time" and "what is true right now."

## Optional homework: build your own MCP server

The course repo includes a working Python FastMCP server at `segment_4_hero/memory_server/`. It demonstrates all three primitives - tools, resources, prompts - backed by a JSON file. Source: `segment_4_hero/memory_server/server.py`. Launcher: `start.sh` (handles `uv sync`, stale-process cleanup, signal forwarding).

**Is FastMCP "the Anthropic way"?** Yes. **FastMCP** is the high-level server API for the Model Context Protocol. Its decorator model (`@mcp.tool`, `@mcp.resource`, `@mcp.prompt`) is what the official docs teach, and a FastMCP 1.x snapshot is vendored into the official `mcp` Python SDK as `mcp.server.fastmcp`. This server pins the current standalone `fastmcp>=3.0.0`, which is the actively maintained upstream. Either import gives you a standalone **stdio** server that `claude mcp add` can register - which is exactly why the consume-demo above works against it.

To register it locally:

```bash
claude mcp add memory -- bash segment_4_hero/memory_server/start.sh
claude --mcp-debug
```

This is **optional**. The course teaches you to consume; the server is there for the day you decide to build. The `python-mcp-expert` subagent in `.claude/agents/` is your pair when you do.

> For deeper MCP topics (sampling, roots, log/progress notifications, Streamable HTTP internals like `stateless: true` and `jsonResponse: true`), see `MCP_SPEC_CHANGELOG.md` in this directory. Those land in the advanced-track follow-on.

## Check your understanding

1. The MCP spec defines two transports as of 2025-11-25. Name them, and name the one that was retired.
2. Of the three MCP primitives, which one does the **model** decide to call versus which the **user** triggers?
3. You add a remote MCP server with `claude mcp add-json` and immediately get a 403. Which header is the server checking, and why?

## What you should be able to do now

By the end of Segment 4, three competencies:

1. **Write a skill** with dynamic context injection (`` !`bash` ``), proper frontmatter, and `${CLAUDE_SKILL_DIR}`-portable scripts.
2. **Design a subagent** in `.claude/agents/` with constrained `allowed-tools` and a focused system prompt, then invoke it from a skill or from a parent agent.
3. **Consume an MCP server** in Claude Code: register it (or use one already registered), inspect it with `/mcp`, and call its tools without authoring any server code.

---

You started with **one CLAUDE.md**. You end with a system that **remembers, acts, composes, and reaches**. The capstone in `tests/segment_4_production/capstone_project.md` is where you make it yours.
