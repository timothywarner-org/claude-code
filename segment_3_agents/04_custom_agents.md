# Custom Agents (Subagents)

<!-- src: https://code.claude.com/docs/en/sub-agents (May 2026) -->

Agents (Anthropic still calls them "subagents" in the official docs) are specialized assistants that run in **their own context window** with their own system prompt, their own tool allowlist, and their own permission boundary. That isolation is the whole point: a subagent's research scrollback never bloats your main conversation.

## Why an isolated context

When Claude delegates to a subagent, the subagent gets a fresh 1M-token window. It runs to completion, summarizes, and returns only the result. Your main conversation sees the summary — not the 200 `Grep` calls and 80 `Read` responses that produced it. Subagents are how Claude Code keeps long sessions sane.

## Agents vs Skills

| Aspect | Agents (`.claude/agents/`) | Skills (`.claude/skills/`) |
|--------|----------------------------|----------------------------|
| **Location** | `.claude/agents/<name>.md` | `.claude/skills/<name>/SKILL.md` |
| **Context** | Isolated (fresh window) | Main conversation |
| **Invocation** | Claude delegates by description match, or you spawn one with `--agents` | You type `/<name>`, or Claude auto-invokes when the description matches |
| **Best for** | Heavyweight side tasks, parallel exploration | Reusable workflows, knowledge injection, parameterized commands |
| **Can use skills?** | Yes, via `skills:` frontmatter (preloaded at startup) | N/A |
| **Custom commands?** | N/A | Custom commands have merged into skills (May 2026) — `.claude/commands/*.md` still works for backward compatibility |

## Agent File Format

Agents are Markdown files with YAML frontmatter:

```markdown
---
name: my-agent
description: When Claude should use this agent
tools: Read, Glob, Grep, Bash
model: claude-sonnet-4-6
skills: code-review
---

You are [agent persona]. When invoked, you...

[System prompt continues...]
```

## Frontmatter Options

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (lowercase, hyphens) |
| `description` | Yes | Plain-English trigger — Claude reads this to decide when to delegate. Be specific. |
| `tools` | No | Allowed tools (inherits the parent allowlist if omitted). Restrict to enforce safety. |
| `model` | No | `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5`, the short aliases `opus`/`sonnet`/`haiku`, or `inherit` |
| `skills` | No | Skills preloaded into the agent's context at startup |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, or `plan` |
| `hooks` | No | PreToolUse, PostToolUse, Stop handlers scoped to this agent |

## Example Agents in This Project

### Code Quality Coach

Location: `.claude/agents/code-quality-coach.md`

```yaml
---
name: code-quality-coach
description: Senior developer mentor that reviews code and teaches best practices
tools: Read, Glob, Grep, Bash
model: claude-sonnet-4-6
skills: code-review
---
```

**Features:**
- Uses the `code-review` skill for automated scanning
- Teaches security and performance concepts
- Provides educational feedback, not just criticism
- Asks knowledge-check questions

**Invocation triggers:**
- "Review my code and teach me"
- "Help me understand this security issue"
- "Coach me on best practices"

### Release Manager

Location: `.claude/agents/release-manager.md`

```yaml
---
name: release-manager
description: DevOps specialist that guides through release preparation
tools: Read, Glob, Grep, Bash
model: claude-sonnet-4-6
skills: deploy-prep
---
```

**Features:**
- Uses the `deploy-prep` skill for pre-flight checks
- Teaches semantic versioning
- Generates changelogs from commits
- Prevents common release mistakes

**Invocation triggers:**
- "Prepare a release"
- "What version should I bump to?"
- "Generate release notes"

### Claude Code Tutor

Location: `.claude/agents/claude-code-tutor.md`

```yaml
---
name: claude-code-tutor
description: Interactive tutor for learning Claude Code concepts
tools: Read, Glob, Grep, Bash
model: claude-sonnet-4-6
---
```

**Features:**
- Teaches MCP, Skills, Agents concepts
- Provides hands-on exercises
- Gives repository tours
- Has quiz mode for testing knowledge

**Invocation triggers:**
- "Explain MCP to me"
- "How do I create a skill?"
- "Teach me about agents"

## Session-Scoped Subagents (no file required)

You can also spawn a subagent without creating a file, scoped to one session, with the `--agents` flag:

```bash
claude --agents '{
  "quick-reviewer": {
    "description": "Quick read-only code review",
    "prompt": "You are a senior code reviewer. Focus on security and clarity.",
    "tools": ["Read", "Glob", "Grep"],
    "model": "claude-haiku-4-5"
  }
}'
```

PowerShell uses a here-string for the JSON to avoid escaping pain:

```powershell
claude --agents @'
{
  "quick-reviewer": {
    "description": "Quick read-only code review",
    "prompt": "You are a senior code reviewer. Focus on security and clarity.",
    "tools": ["Read", "Glob", "Grep"],
    "model": "claude-haiku-4-5"
  }
}
'@
```

Useful for automation scripts where you want a tightly-scoped helper without committing a file.

## Creating Your Own Agent

### Step 1: Create the File

```bash
# Create in project (shared with team)
touch .claude/agents/my-agent.md

# Or in home directory (personal, all projects)
touch ~/.claude/agents/my-agent.md
```

### Step 2: Define Frontmatter

```yaml
---
name: my-agent
description: Clear description of when to use this agent
tools: Read, Glob, Grep  # Only what's needed
model: claude-sonnet-4-6
---
```

### Step 3: Write the System Prompt

```markdown
You are [Agent Name], a [role/persona].

## Your Purpose
[What this agent does]

## When Invoked
[Step-by-step behavior]

## Guidelines
[Rules and constraints]
```

### Step 4: Test

```
Ask Claude: "I need help with [task matching your description]"
```

Claude should automatically delegate to your agent.

## Agents That Use Skills

Agents can load skills into their context:

```yaml
---
name: full-stack-reviewer
description: Reviews both frontend and backend code
tools: Read, Glob, Grep, Bash
skills: code-review, deploy-prep
---
```

When this agent runs, it has access to:
- The `code-review` skill's knowledge and scripts
- The `deploy-prep` skill's workflows
- Its own specialized instructions

## Agent Permission Modes

Control what the agent can do:

```yaml
permissionMode: default      # Ask before each action
permissionMode: acceptEdits  # Auto-approve file edits
permissionMode: dontAsk      # Auto-approve everything (careful!)
permissionMode: plan         # Planning mode only
```

## Hooks for Agents

Add validation before/after tool use:

```yaml
---
name: safe-db-agent
description: Query databases with validation
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly.sh"
---
```

## Agent Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Main Conversation                         │
│                                                                  │
│   User: "Review my code and help me learn"                      │
│                         │                                        │
│                         ▼                                        │
│   Claude recognizes: matches "code-quality-coach" description   │
│                         │                                        │
│                         ▼                                        │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │            Isolated Agent Context                        │   │
│   │  ┌─────────────────────────────────────────────────┐    │   │
│   │  │ code-quality-coach                               │    │   │
│   │  │                                                  │    │   │
│   │  │ • Loads code-review skill                        │    │   │
│   │  │ • Has tools: Read, Glob, Grep, Bash             │    │   │
│   │  │ • Fresh conversation history                     │    │   │
│   │  │ • Runs security_scan.py                         │    │   │
│   │  │ • Provides educational feedback                  │    │   │
│   │  └─────────────────────────────────────────────────┘    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│   Agent returns results to main conversation                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Best Practices

### 1. Write Specific Descriptions

```yaml
# Good - specific triggers
description: Reviews code for security vulnerabilities and teaches
  prevention techniques. Use when learning about secure coding.

# Bad - too vague
description: Helps with code
```

### 2. Limit Tool Access

Only grant tools the agent actually needs:

```yaml
# Good - minimal access
tools: Read, Glob, Grep

# Risky - full access
tools: Read, Write, Edit, Bash
```

### 3. Combine with Skills

Leverage existing skills for complex workflows:

```yaml
skills: code-review, deploy-prep, documentation
```

### 4. Test Delegation

Verify Claude delegates correctly:
- Ask questions matching your description
- Check that the agent behavior matches expectations
- Refine description if delegation doesn't happen

## Sharing Agents

### Team Agents
Commit `.claude/agents/` to version control. Team members get agents automatically.

### Personal Agents
Store in `~/.claude/agents/` for agents available across all your projects.

### Plugin Distribution
Package agents with other Claude Code extensions.

## Next Steps

1. Read the example agents in `.claude/agents/`
2. Try asking Claude to "coach me on code quality"
3. Ask Claude to "prepare a release"
4. Create your own specialized agent
