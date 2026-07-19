# Zero - Claude Code Quick Start

## Cold open

You just told Claude about your project. Congratulations, it forgot the moment you closed the terminal. The next 20 minutes get you to a Claude Code setup that **remembers**.

## The mental model

**Claude is stateless.** Every session starts with amnesia. **`CLAUDE.md` is the first lever you have to give it state** - a plain markdown file Claude reads automatically before answering anything in your project. No SDK, no plugin, no config service. Just a file in the repo root that gets pulled into context on every turn.

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

Three sentences, no more: Claude doesn't "learn" your project between sessions. It re-reads `CLAUDE.md` from disk every time. So whatever you want it to **never forget**, you write down once and commit.

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
# Start the REPL - prompts for API key on first run
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

> **Current model lineup** ([docs.anthropic.com/en/docs/about-claude/models/overview](https://docs.anthropic.com/en/docs/about-claude/models/overview))
>
> | Model | API ID | Context | Best for |
> |-------|--------|---------|----------|
> | **Sonnet 5** | `claude-sonnet-5` | **1M native** | Default in Claude Code. Best speed-to-intelligence ratio |
> | **Opus 4.8** | `claude-opus-4-8` | 1M (via `opus[1m]`) | Agentic coding, deep reasoning |
> | **Haiku 4.5** | `claude-haiku-4-5-20251001` | Large | Lightweight automation, high-frequency calls |
>
> **The context window is 1M tokens.** Sonnet 5 uses the full 1M natively. For Opus, append the
> `[1m]` variant. Turn it off with `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` if you want to cap context cost.
> Model IDs move fast - confirm the current lineup at the docs link above before you record.

```bash
# Alias for the default tier (resolves to Sonnet 5 today, native 1M context)
claude --model sonnet

# Alias for the heavyweight tier (resolves to Opus 4.8 today)
claude --model opus

# Select the 1M-context variant explicitly in the model picker
claude --model opus[1m]

# Pin to an exact model (recommended for production scripts)
claude --model claude-sonnet-5
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
export CLAUDE_MODEL=claude-sonnet-5
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

_Now let's make Claude remember more than just the project root._

## What you should be able to do now

- **Install and verify** Claude Code on your machine (`claude --version` returns a version).
- **Write a project-root `CLAUDE.md`** that captures the three or four facts a teammate would need on day one.
- **See Claude read it** - ask a question whose answer only lives in `CLAUDE.md`, and watch Claude quote it back.
