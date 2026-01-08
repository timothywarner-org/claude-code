# Claude Code CLI Installation & Configuration

## Installation

### Prerequisites

- Node.js 20+ (LTS recommended)
- npm, yarn, or pnpm
- Anthropic API key

### Install Claude Code

```bash
# Using npm
npm install -g @anthropic-ai/claude-code

# Using yarn
yarn global add @anthropic-ai/claude-code

# Using pnpm
pnpm add -g @anthropic-ai/claude-code
```

### Verify Installation

```bash
claude --version
claude --help
```

### First-Time Setup

```bash
# Start Claude Code - it will prompt for API key on first run
claude

# Or provide API key via environment variable
export ANTHROPIC_API_KEY=sk-ant-api03-...
claude
```

## Configuration

### Configuration Files

Claude Code uses a hierarchy of configuration files:

1. **User settings** (`~/.claude/settings.json`) - Global defaults
2. **Project settings** (`.claude/settings.json`) - Project-specific overrides
3. **CLAUDE.md** - Project context and instructions

### User Settings Example

```json
// ~/.claude/settings.json
{
  "model": "claude-sonnet-4-20250514",
  "permissions": {
    "allow": ["Read", "Glob", "Grep"],
    "deny": []
  },
  "theme": "dark",
  "verbose": false
}
```

### Project Settings Example

```json
// .claude/settings.json
{
  "allowedTools": ["Read", "Glob", "Grep", "Bash", "Edit", "Write"],
  "denyTools": [],
  "customInstructions": "This is a TypeScript project. Use strict mode and ESLint.",
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["tsx", "./mcp_servers/memory_server/server.ts"]
    }
  }
}
```

### CLAUDE.md File

Create a `CLAUDE.md` in your project root to provide context:

```markdown
# Project Context

This is a TypeScript monorepo for [project description].

## Commands

- `npm run build` - Build all packages
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Architecture

- `/src` - Main source code
- `/tests` - Test files
- `/docs` - Documentation

## Conventions

- Use strict TypeScript
- All exports must have JSDoc comments
- Tests use Vitest
```

## CLI Reference

### Basic Commands

| Command | Description |
|---------|-------------|
| `claude` | Start interactive REPL |
| `claude "query"` | Start with initial prompt |
| `claude -p "query"` | Print mode (non-interactive) |
| `claude -c` | Continue most recent conversation |
| `claude update` | Update to latest version |

### Model Selection

```bash
# Use specific model
claude --model claude-sonnet-4-20250514
claude --model claude-opus-4-5-20251101

# Use aliases
claude --model sonnet
claude --model opus
```

### Output Formats

```bash
# JSON output (for scripting)
claude -p "query" --output-format json

# Streaming JSON
claude -p "query" --output-format stream-json

# Verbose output (debugging)
claude --verbose "query"
```

### Permission Control

```bash
# Allow specific tools only
claude --tools "Read,Glob,Grep"

# Pre-approve tools (no prompts)
claude --allowedTools "Read,Glob"

# Skip all permission prompts (use carefully!)
claude --dangerously-skip-permissions
```

### System Prompts

```bash
# Custom system prompt
claude --system-prompt "You are a TypeScript expert"

# From file
claude --system-prompt-file ./prompts/typescript.txt

# Append to default
claude --append-system-prompt "Always use ESLint"
```

## MCP Configuration

### Add MCP Server

```bash
# Interactive
claude mcp add

# From JSON
claude mcp add-json memory '{"command": "npx", "args": ["tsx", "./server.ts"]}'

# Load config file
claude --mcp-config ./mcp-servers.json
```

### Debug MCP

```bash
# Enable MCP debugging
claude --mcp-debug

# View available MCP tools
claude /mcp
```

## Custom Slash Commands

Create custom commands in `.claude/commands/`:

### Example: Fix GitHub Issue

```markdown
<!-- .claude/commands/fix-issue.md -->
Fix GitHub issue #$ARGUMENTS

1. Read the issue details from GitHub
2. Understand the root cause
3. Implement the fix
4. Write tests
5. Create a descriptive commit
```

Usage: `/project:fix-issue 123`

### Example: Code Review

```markdown
<!-- .claude/commands/review.md -->
Review the changes in the current branch:

1. Run `git diff main...HEAD`
2. Analyze each changed file
3. Check for:
   - Security issues
   - Performance problems
   - Code style violations
   - Missing tests
4. Provide actionable feedback
```

Usage: `/project:review`

## Tips & Tricks

### Useful Aliases

```bash
# Add to your .bashrc/.zshrc
alias cc="claude"
alias ccr="claude -c"  # Resume last conversation
alias ccp="claude -p"  # Print mode
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Cancel current operation |
| `Ctrl+D` | Exit Claude Code |
| `Tab` | Autocomplete file paths |
| `↑/↓` | Navigate history |

### Environment Variables

```bash
# Required
export ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional
export CLAUDE_MODEL=claude-sonnet-4-20250514
export CLAUDE_CONFIG_DIR=~/.claude
export LOG_LEVEL=debug
```
