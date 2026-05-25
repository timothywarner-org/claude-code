# Agents, Part 1: Autonomy with Boundaries

> Part 1 of a two-part story. Part 2 is `04_custom_agents.md` (subagents with their own context window). Read them as one continuous arc: this file frames the **agent loop in your main conversation**; part 2 frames **subagents** as a force multiplier on top of it.

## Cold open

You can let Claude drive ten tools in a row without asking permission each time. That is an **agent**. The same trick that saves you an hour can torch your branch in thirty seconds. This segment teaches both edges of that knife.

## The mental model

An **agent** is Claude with permission to take multiple actions without checking in. Same model, same conversation, different permission posture. The loop is four moves:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Agent Loop                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐           │
│   │  Plan   │────►│ Execute │────►│ Observe │────►│ Adjust  │           │
│   └─────────┘     └─────────┘     └─────────┘     └────┬────┘           │
│        ▲                                               │                 │
│        └───────────────────────────────────────────────┘                 │
│                        (repeat until done)                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Agents come in two forms** in Claude Code. Hold this distinction in your head for the rest of the segment.

1. **The agent loop in your main conversation** (this file). You scope what Claude may touch with `--allowedTools` and a CLAUDE.md boundary spec. Same context window you already have.
2. **Subagents** (see `04_custom_agents.md`). Specialized assistants with **their own context window**. Spawned by description match or by `--agents` flag. Their research scrollback never bloats your main session.

This file teaches the loop. Part 2 teaches the force multiplier.

### Why boundaries are not optional

Claude reads CLAUDE.md **on every turn**. That means the boundary file is a **kill switch you can edit in real time**. Add a "do not touch `tsconfig.json`" line, save the file, and the next tool call respects it. No restart, no flag, no config reload. Change markdown, change behavior. This is why Segment 2 spent so much time on CLAUDE.md scopes: the boundary spec is just a scoped CLAUDE.md sitting next to the code it governs.

The two autonomy levers you actually use:

```bash
# Scoped autonomy: read-only exploration, no surprises
claude --allowedTools "Read,Glob,Grep"

# Full autonomy: only inside a throwaway branch, never on main
claude --dangerously-skip-permissions
```

Everything in between is a CLAUDE.md decision.

## The demo

Walk through `demos/segment_3_agents_punchlist.md`. The short version:

1. Launch Claude with `--allowedTools "Read,Glob,Grep"` (read-only autonomy).
2. Ask it to map this codebase's architecture.
3. Watch it take 15+ actions without a single permission prompt.
4. `Ctrl+D` out. Edit `segment_3_agents/CLAUDE.md` to add a deny rule.
5. Relaunch with write tools enabled. Ask for a destructive change. Watch Claude refuse, citing your edit.

The punchlist has the exact commands and the expected output.

## Try it now (10 minutes, your own repo)

Run this against a real repository of yours, not the course repo. The goal is to feel the **scoped autonomy** posture.

```bash
# 1. cd into a repo you know well
cd path/to/your/repo

# 2. Launch read-only agent
claude --allowedTools "Read,Glob,Grep"

# 3. Give it a job that needs many tool calls
> Map this codebase. List the top-level modules, the public API surface,
  and any tests that look stale. Output a one-page Markdown report.

# 4. Watch the loop. Count the tool calls.
# 5. When it finishes, ask:
> What would you have done differently if you had Edit?
```

What you should notice: Claude executes a dozen-plus actions, summarizes findings, and never once asks "may I read this file?" That is the agent loop. The `--allowedTools` flag is the boundary. No CLAUDE.md needed for this slice because the flag already says "read-only."

Now imagine that same loop with `Write,Edit,Bash` added and **no** boundary spec. That is why the next file exists.

## Check your understanding

1. Claude reads CLAUDE.md once at session start. **True or false?**
2. You want Claude to refactor an auth module overnight while you sleep. Which two autonomy levers do you reach for, and in what order?
3. What is the one architectural difference between the **agent loop** (this file) and a **subagent** (part 2)?

Answers, in order: **false** (every turn); **`--allowedTools` first to scope the toolset, then a CLAUDE.md in the working directory to deny dangerous paths, and a fresh git branch as the third belt because two is never enough**; **a subagent runs in its own context window so its scrollback does not bloat the main conversation**.

> One agent is useful. A team of small specialized agents, each with its own context window, is a force multiplier. That is `04_custom_agents.md`.

## What you should be able to do now

1. **Launch Claude with `--allowedTools`** to scope autonomy to a specific risk level.
2. **Write a CLAUDE.md boundary spec** that Claude will respect on every turn (see `segment_3_agents/CLAUDE.md` in this directory for the canonical example).
3. **Design a permission policy** that matches a real risk level: read-only for exploration, guided-edit for feature work, full-auto only inside a throwaway branch.

## Next

Read `04_custom_agents.md` for subagents. Same model, isolated context, parallel exploration.
