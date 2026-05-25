# Zero — Claude Code Quick Start

## Cold open

You just told Claude about your project. Congratulations, it forgot the moment you closed the terminal. The next 20 minutes get you to a Claude Code setup that **remembers**.

## The mental model

**Claude is stateless.** Every session starts with amnesia. **`CLAUDE.md` is the first lever you have to give it state** — a plain markdown file Claude reads automatically before answering anything in your project. No SDK, no plugin, no config service. Just a file in the repo root that gets pulled into context on every turn.

```text
  your terminal                    your repo
  ┌────────────┐    starts     ┌─────────────────┐
  │  claude    │ ────────────► │  ./CLAUDE.md    │
  │  (REPL)    │ ◄──── reads ──┤  (project memo) │
  └────────────┘               └─────────────────┘
        │                              ▲
        │   you ask a question         │
        └──────► Claude answers with that file already in context
```

Three sentences, no more: Claude does not "learn" your project between sessions. It re-reads `CLAUDE.md` from disk every time. So whatever you want it to **never forget**, you write down once and commit.

## Installation

### Prerequisites

- **Node.js 20+** (LTS recommended)
- **Anthropic API key** ([console.anthropic.com](https://console.anthropic.com/))

### Install Claude Code

```bash
# Using npm (recommended)
npm install -g @anthropic-ai/claude-code

# Verify
claude --version
```

### First run

```bash
# Start the REPL — prompts for API key on first run
claude

# Or set the key in your shell first
export ANTHROPIC_API_KEY=sk-ant-api03-...
claude
```

## Essential commands

| Command | Description |
|---------|-------------|
| `claude` | Start interactive REPL |
| `claude "query"` | Start with an initial prompt |
| `claude -p "query"` | Print mode (non-interactive, scripts) |
| `claude -c` | Continue most recent conversation |
| `claude update` | Update to latest version |

## Model selection

> **May 2026 model lineup** ([docs.anthropic.com/en/docs/about-claude/models/overview](https://docs.anthropic.com/en/docs/about-claude/models/overview))
>
> | Model | API ID | Context | Pricing (in/out / MTok) | Best for |
> |-------|--------|---------|--------------------------|----------|
> | **Opus 4.7** | `claude-opus-4-7` | **1M** | $5 / $25 | Agentic coding, deep reasoning |
> | **Sonnet 4.6** | `claude-sonnet-4-6` | **1M** | $3 / $15 | Default. Best speed-to-intelligence ratio |
> | **Haiku 4.5** | `claude-haiku-4-5` | 200k | $1 / $5 | Lightweight automation, high-frequency calls |
>
> Deprecated and retiring **2026-06-15**: `claude-sonnet-4-20250514`, `claude-opus-4-20250514`. Migrate before that date.

```bash
# Alias for the default tier (resolves to Sonnet 4.6 today)
claude --model sonnet

# Alias for the heavyweight tier (resolves to Opus 4.7 today)
claude --model opus

# Pin to an exact snapshot (recommended for production scripts)
claude --model claude-sonnet-4-6
```

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Cancel current operation |
| `Ctrl+D` | Exit Claude Code |
| `Tab` | Autocomplete file paths |
| `↑/↓` | Navigate history |

## Useful aliases

Add to your `.bashrc` or `.zshrc`:

```bash
alias cc="claude"
alias ccr="claude -c"  # Resume last conversation
alias ccp="claude -p"  # Print mode for scripts
```

## Environment variables

```bash
# Required
export ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional
export CLAUDE_MODEL=claude-sonnet-4-6
export CLAUDE_CONFIG_DIR=~/.claude
```

## The demo

Follow along live: **[`demos/segment_1_zero_punchlist.md`](../demos/segment_1_zero_punchlist.md)**. Five steps: verify install, watch Claude forget your project, write a 10-line `CLAUDE.md`, restart, watch Claude remember. The whole arc takes under five minutes.

## Try-it-now (10-15 min)

Open **[`tests/segment_1_fundamentals/exercise_1_context_window.md`](../tests/segment_1_fundamentals/exercise_1_context_window.md)** and work through it. You'll count tokens in a real codebase (Express) and feel where the 1M context window actually starts to bite. This is the hands-on counterpart to the mental model above.

## Check your understanding

Three quick questions. Drop your answers in chat:

1. Where does Claude look for project context when you run `claude` in a repo?
2. What happens to `CLAUDE.md` content at the start of each new session?
3. What's the smallest useful `CLAUDE.md` you could write for your current project right now?

*Now let's make Claude remember more than just the project root.*

## What you should be able to do now

- **Install and verify** Claude Code on your machine (`claude --version` returns a version).
- **Write a project-root `CLAUDE.md`** that captures the three or four facts a teammate would need on day one.
- **See Claude read it** — ask a question whose answer only lives in `CLAUDE.md`, and watch Claude quote it back.
