# Skills and Custom Slash Commands

Skills extend Claude Code with reusable capabilities and workflows.

## What are Skills?

Skills are custom slash commands that:

- Define reusable prompts and workflows
- Can be invoked with `/project:skill-name`
- Support dynamic arguments with `$ARGUMENTS`
- Can include scripts, templates, and supporting documentation
- Combine with agents for powerful automation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Skills System                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   User types: /project:code-review                                       │
│                    │                                                     │
│                    ▼                                                     │
│   ┌─────────────────────────────────┐                                   │
│   │  .claude/commands/code-review/  │                                   │
│   │  ├── code-review.md             │ ◄── Main skill file               │
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

## Skill Capabilities

### Simple Skills (Markdown Only)

Basic skills are single markdown files:

```markdown
<!-- .claude/commands/greet.md -->
Say hello to $ARGUMENTS and wish them a great day!
```

### Advanced Skills (Multi-File)

Production skills include multiple components:

```
my-skill/
├── my-skill.md           # Main skill file with frontmatter
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
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh"
---
```

### Available Frontmatter Fields

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Skill identifier | `code-review` |
| `description` | When Claude should use this skill | `Review PRs and staged changes` |
| `allowed-tools` | Pre-approved tools (no confirmation) | `Read, Glob, Bash(git:*)` |
| `argument-hint` | Show expected arguments | `[branch] [--dry-run]` |
| `hooks` | Pre/post tool execution hooks | See hooks section |
| `context` | Run in isolated context | `fork` |
| `model` | Override model for this skill | `claude-opus-4-5-20251101` |

## Example Skills in This Project

### Code Review Skill

Location: `.claude/commands/code-review/`

```
code-review/
├── code-review.md          # Main workflow
├── SECURITY_CHECKLIST.md   # OWASP Top 10 reference
├── PERFORMANCE_GUIDE.md    # Performance patterns
└── scripts/
    ├── security_scan.py    # Automated security scanning
    └── lint_check.py       # ESLint/TypeScript/Prettier checks
```

**Usage:**
```bash
/project:code-review                    # Review current branch
/project:code-review feature/auth       # Review specific branch
/project:code-review --staged           # Review staged changes only
/project:code-review src/api.ts         # Review specific file
```

**Features:**
- Runs automated security scans (Python script)
- Checks for OWASP Top 10 vulnerabilities
- Analyzes performance patterns
- Outputs structured JSON report

### Deploy Prep Skill

Location: `.claude/commands/deploy-prep/`

```
deploy-prep/
├── deploy-prep.md          # Main workflow
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
/project:deploy-prep                    # Default patch bump
/project:deploy-prep minor              # Minor version bump
/project:deploy-prep major --dry-run    # Preview major bump
```

**Features:**
- Validates git state, tests, and build
- Generates changelog from conventional commits
- Includes release templates
- Supports dry-run mode

## Creating Your Own Skills

### Step 1: Create Directory Structure

```bash
mkdir -p .claude/commands/my-skill/scripts
```

### Step 2: Create Main Skill File

```markdown
<!-- .claude/commands/my-skill/my-skill.md -->
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
python .claude/commands/my-skill/scripts/validate.py $1
```

## Step 3: Generate Output

Produce structured output in this format:
...
```

### Step 3: Add Supporting Files

- **Documentation**: Reference guides Claude can load when needed
- **Scripts**: Executable Python/Bash scripts for automation
- **Templates**: Output formats and examples

### Step 4: Test Your Skill

```bash
claude
> /project:my-skill test-argument
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

## Skills vs. Slash Commands

| Feature | Skills (Agent-Invoked) | Commands (User-Invoked) |
|---------|------------------------|-------------------------|
| Location | `.claude/skills/` | `.claude/commands/` |
| Invocation | Claude decides when to use | User types `/project:name` |
| Best for | Background capabilities | Explicit workflows |
| Discovery | Automatic via description | Manual via `/` menu |

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

Commit `.claude/commands/` to your repository. Team members get skills automatically.

### Personal Skills

Store in `~/.claude/commands/` for skills available across all projects.

### Plugins

Package skills with other Claude Code extensions for distribution.

## Next Steps

1. Explore the example skills in `.claude/commands/`
2. Run `/project:code-review` on your current branch
3. Try `/project:deploy-prep --dry-run`
4. Create a custom skill for your workflow
