# Skills and Custom Slash Commands

<!-- src: https://code.claude.com/docs/en/skills (May 2026) -->

Skills extend Claude Code with reusable workflows, knowledge, and parameterized automation. Either you invoke a skill explicitly with `/<skill-name>`, or Claude loads it automatically when your request matches the skill's `description`.

> **May 2026 change**: custom slash commands have **merged with skills**. A file at `.claude/skills/deploy/SKILL.md` and a legacy file at `.claude/commands/deploy.md` both create `/deploy` and work the same way. The `.claude/commands/` form still works for backward compatibility, but **`.claude/skills/<name>/SKILL.md` is the canonical location going forward** and unlocks features like supporting files, frontmatter-controlled invocation, and dynamic context injection.

## What are Skills?

Skills:

- Define reusable workflows, system prompts, and parameterized procedures
- Can be invoked with `/<skill-name>` or auto-triggered by Claude when the description matches your request
- Support dynamic arguments via `$ARGUMENTS`, `$1` / `$2` (positional), or named arguments
- Can inline shell command output at render time with `` !`<bash>` ``
- Can include scripts, templates, and supporting documentation
- Can fork into an isolated subagent context via `context: fork`

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Skills System (May 2026)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   You type: /code-review        or       Claude infers it from request   │
│                    │                                                     │
│                    ▼                                                     │
│   ┌─────────────────────────────────┐                                   │
│   │  .claude/skills/code-review/    │  (canonical location)             │
│   │  ├── SKILL.md                   │ ◄── Main skill file               │
│   │  ├── SECURITY_CHECKLIST.md      │ ◄── Supporting docs               │
│   │  ├── PERFORMANCE_GUIDE.md       │                                   │
│   │  └── scripts/                   │                                   │
│   │      ├── security_scan.py       │ ◄── Executable scripts            │
│   │      └── lint_check.py          │                                   │
│   └─────────────────────────────────┘                                   │
│                    │                                                     │
│                    ▼                                                     │
│   Claude executes workflow, running scripts and loading docs as needed  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Where skills live (priority order)

| Scope | Path | Applies to |
|-------|------|------------|
| Enterprise | Managed settings | All users in your org |
| Personal | `~/.claude/skills/<name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<name>/SKILL.md` | This project only |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Wherever the plugin is enabled |

Same name across scopes? Enterprise overrides personal, personal overrides project. Plugin skills are namespaced (`plugin-name:skill-name`) so they cannot conflict.

## Skill Capabilities

### Simple Skills (Markdown Only)

Basic skills are single markdown files:

```markdown
<!-- .claude/skills/greet/SKILL.md -->
Say hello to $ARGUMENTS and wish them a great day!
```

### Advanced Skills (Multi-File)

Production skills include multiple components:

```
my-skill/
├── SKILL.md              # Main skill file with frontmatter (REQUIRED)
├── REFERENCE.md          # Supporting documentation
├── EXAMPLES.md           # Usage examples
├── scripts/
│   ├── validate.py       # Validation script
│   └── process.sh        # Processing script
└── templates/
    └── output.md         # Output templates
```

## Frontmatter Options

Skills support YAML frontmatter for advanced configuration:

```yaml
---
name: code-review
description: Comprehensive code review with security scanning
allowed-tools: Read, Glob, Grep, Bash(git:*, npm:test, python:*)
argument-hint: "[branch|file|--staged]"
model: claude-sonnet-4-6
effort: medium
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh"
---
```

### Available Frontmatter Fields

<!-- src: https://code.claude.com/docs/en/skills (May 2026) -->

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Skill identifier (lowercase, hyphens, max 64 chars). Defaults to directory name. | `code-review` |
| `description` | When Claude should use this skill. Truncated at 1,536 chars in the listing — put the key use case first. | `Review PRs and staged changes` |
| `when_to_use` | Extra trigger phrases or example requests. Appended to `description`. | `User asks "review my code" or "scan PR"` |
| `disable-model-invocation` | If `true`, only you can invoke it (no auto-load by Claude). | `true` for `/deploy`, `/commit` |
| `user-invocable` | If `false`, only Claude can invoke it (hidden from the `/` menu). | `false` for pure reference skills |
| `allowed-tools` | Tools the skill may use without permission prompts. | `Read, Glob, Bash(git:*)` |
| `argument-hint` | Show expected arguments during autocomplete. | `[branch] [--dry-run]` |
| `arguments` | Named positional arguments for `$name` substitution. | `[issue, branch]` |
| `model` | Override model for this skill's turn. | `claude-sonnet-4-6` |
| `effort` | Reasoning effort: `low`, `medium`, `high`, `xhigh`, `max`. | `high` |
| `context` | `fork` runs the skill in an isolated subagent context. | `fork` |
| `agent` | Which subagent type when `context: fork`. | `Explore`, `Plan`, `general-purpose` |
| `paths` | Glob patterns that limit when the skill auto-loads. | `src/**/*.ts, **/*.tsx` |
| `hooks` | Pre/post tool execution hooks scoped to this skill. | See hooks section |
| `shell` | `bash` (default) or `powershell` for inline `` !`cmd` `` execution. | `powershell` |

### Argument Substitutions

| Variable | Meaning |
|----------|---------|
| `$ARGUMENTS` | The full argument string as typed |
| `$1`, `$2`, ... or `$ARGUMENTS[0]`, `$ARGUMENTS[1]` | Positional arguments (shell-style quoting — wrap multi-word values in quotes) |
| `$name` (when `arguments:` declares names) | Named argument, mapped by position |
| `${CLAUDE_SESSION_ID}` | Current session ID — useful for log files |
| `${CLAUDE_EFFORT}` | The active effort level |
| `${CLAUDE_SKILL_DIR}` | Absolute path to this skill's directory — use for bundled scripts |

### Dynamic Context Injection

Skills can run shell commands at render time and inline the output before Claude sees the prompt:

```markdown
## Current changes

!`git diff HEAD`

## Instructions
Summarize the diff above in 2-3 bullets and flag anything risky.
```

The `` !`git diff HEAD` `` line gets replaced with the command output before the skill content reaches Claude. For multi-line commands use a fenced code block opened with `` ```! ``.

## Example Skills in This Project

### Code Review Skill

Location: `.claude/skills/code-review/`

```
code-review/
├── SKILL.md                # Main workflow (canonical filename)
├── SECURITY_CHECKLIST.md   # OWASP Top 10 reference
├── PERFORMANCE_GUIDE.md    # Performance patterns
└── scripts/
    ├── security_scan.py    # Automated security scanning
    └── lint_check.py       # ESLint/TypeScript/Prettier checks
```

**Usage:**
```bash
/code-review                    # Review current branch
/code-review feature/auth       # Review specific branch
/code-review --staged           # Review staged changes only
/code-review src/api.ts         # Review specific file
```

**Features:**
- Runs automated security scans (Python script)
- Checks for OWASP Top 10 vulnerabilities
- Analyzes performance patterns
- Outputs structured JSON report

### Deploy Prep Skill

Location: `.claude/skills/deploy-prep/`

```
deploy-prep/
├── SKILL.md                # Main workflow (canonical filename)
├── CHANGELOG_FORMAT.md     # Changelog formatting rules
├── SEMVER_GUIDE.md         # Version bump guidance
├── scripts/
│   ├── preflight_check.py  # Pre-deployment validation
│   └── generate_changelog.py  # Changelog generation
└── templates/
    └── RELEASE_TEMPLATE.md # GitHub release template
```

**Usage:**
```bash
/deploy-prep                    # Default patch bump
/deploy-prep minor              # Minor version bump
/deploy-prep major --dry-run    # Preview major bump
```

**Features:**
- Validates git state, tests, and build
- Generates changelog from conventional commits
- Includes release templates
- Supports dry-run mode

## Worked Example: Skill that forks into an Explore subagent

This skill researches a topic in an isolated context — the subagent runs to completion and only the summary returns to your main conversation:

```yaml
---
name: deep-research
description: Research a topic thoroughly across the codebase
context: fork
agent: Explore
allowed-tools: Read, Glob, Grep
model: claude-sonnet-4-6
---

Research $ARGUMENTS thoroughly:

1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

Running `/deep-research authentication flow` spawns an Explore agent in a fresh context. Your main session sees only the final summary — not the 40 file reads it took to produce.

## Worked Example: Skill that injects live shell output

The `` !`<bash>` `` syntax runs commands at render time and inlines the output **before Claude sees the prompt**:

```yaml
---
name: pr-summary
description: Summarize the current pull request
context: fork
agent: Explore
allowed-tools: Bash(gh *)
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize the PR. Flag risks. Suggest reviewers.
```

This is preprocessing, not tool use. Claude only sees the rendered prompt with actual PR data inlined.

## Creating Your Own Skills

### Step 1: Create Directory Structure

```bash
mkdir -p .claude/skills/my-skill/scripts
```

### Step 2: Create Main Skill File

```markdown
<!-- .claude/skills/my-skill/SKILL.md -->
---
name: my-skill
description: Brief description for when Claude should use this
allowed-tools: Read, Glob, Grep
argument-hint: "[arg1] [--flag]"
---

# My Skill Workflow

Execute this workflow for $ARGUMENTS.

## Step 1: Gather Information

First, understand the context by reading relevant files.

## Step 2: Run Validation

```bash
python ${CLAUDE_SKILL_DIR}/scripts/validate.py $1
```

## Step 3: Generate Output

Produce structured output in this format:
...
```

### Step 3: Add Supporting Files

- **Documentation**: Reference guides Claude can load when needed
- **Scripts**: Executable Python/Bash scripts — use `${CLAUDE_SKILL_DIR}` so the path resolves whether the skill is installed personal, project, or plugin scope
- **Templates**: Output formats and examples

### Step 4: Test Your Skill

```bash
claude
> /my-skill test-argument
```

## Tool Restrictions

The `allowed-tools` field uses patterns:

```yaml
allowed-tools: Read, Glob, Grep, Bash(git:*, npm:test)
```

| Pattern | Meaning |
|---------|---------|
| `Read` | Allow Read tool |
| `Bash(git:*)` | Allow Bash only for git commands |
| `Bash(npm:test)` | Allow only `npm test` |
| `Bash(python:*)` | Allow Python script execution |

## Hooks

Skills can define hooks that run before/after tool calls:

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "echo 'About to run Bash command'"
  PostToolUse:
    - matcher: "Write"
      hooks:
        - type: command
          command: "npm run lint"
```

## Skills vs. Legacy Custom Commands

In May 2026 Anthropic merged custom slash commands into skills. Both forms still work, but skills are now canonical and unlock features the legacy form does not have.

| Feature | Skills (`.claude/skills/<name>/SKILL.md`) | Legacy Commands (`.claude/commands/<name>.md`) |
|---------|--------------------------------------------|-------------------------------------------------|
| Status | **Canonical, recommended** | Backward-compatible only |
| Supporting files (scripts, refs, templates) | Yes | No |
| Frontmatter (`disable-model-invocation`, `context: fork`, `allowed-tools`, `paths`, ...) | Full set | Limited subset |
| Auto-load by Claude when description matches | Yes | Limited |
| Dynamic context injection (`` !`cmd` ``) | Yes | No |
| Run in isolated subagent context | Yes (`context: fork`) | No |
| Invocation | `/<name>` (no `project:` prefix needed) | `/<name>` |

> Use `.claude/skills/` for everything new. Migrate existing `.claude/commands/` skills when you next touch them — rename the file to `SKILL.md`, move it into a subdirectory named after the command, and you can immediately start using the new fields.

## How skills relate to MCP

If you read Segment 2, you may notice an echo: MCP servers expose three primitives — **tools** (model-controlled), **resources** (app-controlled), and **prompts** (user-controlled). Skills are not MCP primitives, but they slot into the same control hierarchy:

| What it serves | MCP analog | Claude Code form |
|----------------|------------|------------------|
| **Claude** decides when to use a capability | Tool | A skill with auto-invocation enabled (default) |
| **The app/CLI** loads data into context | Resource | A skill with `disable-model-invocation: true` and dynamic context injection |
| **You** trigger a workflow on demand | Prompt | A skill invoked with `/<name>` |

Same control pattern, different runtime. MCP gives Claude reach into outside systems; skills give Claude reach into your local workflows.

## Best Practices

### 1. Write Clear Descriptions

The `description` field determines when Claude uses a skill automatically:

```yaml
# Good - specific triggers
description: Run security scans on code changes, PRs, or before deployment

# Bad - too vague
description: Help with code
```

### 2. Use Progressive Disclosure

Keep the main skill file concise. Put detailed reference material in separate files:

```markdown
## Quick Reference
Essential info here (under 50 lines)

## Detailed Documentation
For full security checklist, see [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)
```

### 3. Make Scripts Portable

Scripts should:
- Use common languages (Python, Bash)
- Handle missing dependencies gracefully
- Output JSON for easy parsing
- Exit with proper codes

### 4. Document Expected Arguments

```yaml
argument-hint: "[branch|file|--staged] [--dry-run]"
```

### 5. Test Thoroughly

- Test with various argument combinations
- Test script error handling
- Test on different platforms

## Sharing Skills

### Team Skills (Git)

Commit `.claude/skills/` to your repository. Team members get skills automatically when they trust the workspace.

### Personal Skills

Store in `~/.claude/skills/` for skills available across all projects.

### Plugins

Package skills with other Claude Code extensions for distribution. Plugin skills use a `plugin-name:skill-name` namespace so they cannot collide with project skills.

## Next Steps

1. Explore the example skills in `.claude/skills/`
2. Run `/code-review` on your current branch
3. Try `/deploy-prep --dry-run`
4. Create a custom skill for your workflow — start with the `summarize-changes` recipe in the Claude Code docs
