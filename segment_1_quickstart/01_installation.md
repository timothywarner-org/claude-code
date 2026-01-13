# Claude Code Quick Start

Get productive with Claude Code in minutes.

## Installation

### Prerequisites

- Node.js 20+ (LTS recommended)
- Anthropic API key ([get one here](https://console.anthropic.com/))

### Install Claude Code

```bash
# Using npm (recommended)
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version
```

### First Run

```bash
# Start Claude Code - will prompt for API key on first run
claude

# Or set API key first
export ANTHROPIC_API_KEY=sk-ant-api03-...
claude
```

## Essential Commands

| Command | Description |
|---------|-------------|
| `claude` | Start interactive REPL |
| `claude "query"` | Start with initial prompt |
| `claude -p "query"` | Print mode (non-interactive, for scripts) |
| `claude -c` | Continue most recent conversation |
| `claude update` | Update to latest version |

## Configuration Files

Claude Code uses a configuration hierarchy:

1. **User settings** (`~/.claude/settings.json`) - Global defaults
2. **Project settings** (`.claude/settings.json`) - Project-specific
3. **CLAUDE.md** - Project context and instructions

### Create CLAUDE.md (Recommended)

Every project should have a `CLAUDE.md` file in the root:

```markdown
# Project Context

This is a [describe your project].

## Commands
- `npm run build` - Build the project
- `npm test` - Run tests

## Architecture
- `/src` - Source code
- `/tests` - Test files

## Conventions
- Use TypeScript strict mode
- All functions need JSDoc comments
```

### Project Settings

Create `.claude/settings.json`:

```json
{
  "allowedTools": ["Read", "Glob", "Grep", "Bash", "Edit", "Write"],
  "customInstructions": "This is a TypeScript project using strict mode."
}
```

## Quick Workflows

### Code Review

```bash
# Review current changes
claude "Review my staged changes for security issues"

# Review a specific file
claude "Review src/auth.ts for potential bugs"
```

### Refactoring

```bash
# Refactor with context
claude "Refactor the UserService class to use dependency injection"
```

### Documentation

```bash
# Generate docs
claude "Generate JSDoc comments for all exported functions in src/api.ts"
```

### Debugging

```bash
# Debug an issue
claude "Why is the login test failing? Check tests/auth.test.ts"
```

## Model Selection

```bash
# Use Claude Sonnet (default, fast)
claude --model sonnet

# Use Claude Opus (slower, more capable)
claude --model opus

# Specify exact model version
claude --model claude-sonnet-4-20250514
```

## Useful Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
alias cc="claude"
alias ccr="claude -c"  # Resume last conversation
alias ccp="claude -p"  # Print mode for scripts
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Cancel current operation |
| `Ctrl+D` | Exit Claude Code |
| `Tab` | Autocomplete file paths |
| `↑/↓` | Navigate history |

## Environment Variables

```bash
# Required
export ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional
export CLAUDE_MODEL=claude-sonnet-4-20250514
export CLAUDE_CONFIG_DIR=~/.claude
```

## Next Steps

1. Create a `CLAUDE.md` file in your project
2. Try: `claude "Explain the architecture of this codebase"`
3. Learn about MCP servers in Segment 2
