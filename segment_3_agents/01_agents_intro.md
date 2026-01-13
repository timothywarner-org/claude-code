# Claude Code Agents

Agents enable Claude to work autonomously on multi-step tasks.

## What is Agentic Mode?

In agentic mode, Claude Code can:

- **Plan** multi-step operations
- **Execute** tools autonomously
- **Iterate** until the task is complete
- **Recover** from errors and adjust approach

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Agentic Loop                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐          │
│   │  Plan   │────►│ Execute │────►│ Observe │────►│ Adjust  │          │
│   └─────────┘     └─────────┘     └─────────┘     └────┬────┘          │
│        ▲                                               │                │
│        └───────────────────────────────────────────────┘                │
│                        (repeat until done)                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Enabling Agentic Mode

### Permission Levels

```bash
# Interactive mode (default) - Claude asks before each action
claude

# Pre-approve specific tools (semi-agentic)
claude --allowedTools "Read,Glob,Grep,Edit,Write"

# Fully autonomous (use carefully!)
claude --dangerously-skip-permissions
```

### Tool Permissions in Settings

Create `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": ["Read", "Glob", "Grep"],
    "deny": ["Bash"]
  }
}
```

## Agent Boundaries

Define what Claude can and cannot do:

### Safe for Autonomous Operation

- ✅ Reading files (`Read`, `Glob`, `Grep`)
- ✅ Analyzing code structure
- ✅ Generating documentation
- ✅ Writing new files (with `Write`)
- ✅ Editing existing files (with `Edit`)

### Requires Human Approval

- ⚠️ Running shell commands (`Bash`)
- ⚠️ Making git commits
- ⚠️ Modifying system configuration
- ⚠️ External API calls

### Never Allow Autonomously

- ❌ Deleting files without confirmation
- ❌ Force pushing to git
- ❌ Modifying credentials or secrets
- ❌ Running destructive shell commands

## Agentic Patterns

### Pattern 1: Explore → Plan → Execute

```bash
# Claude explores, plans, then executes
claude "Find all TypeScript files with TODO comments, create an issue for each"
```

Claude will:
1. Search for TODO comments
2. Analyze and categorize them
3. Create structured issues (or output)

### Pattern 2: Iterative Refinement

```bash
# Claude runs tests, fixes failures, repeats
claude "Run the tests and fix any failures. Keep going until all tests pass."
```

Claude will:
1. Run the test suite
2. Analyze failures
3. Fix each issue
4. Re-run tests
5. Repeat until green

### Pattern 3: Multi-File Refactoring

```bash
# Claude refactors across the codebase
claude "Rename the User class to Account everywhere in the codebase"
```

Claude will:
1. Find all references
2. Update imports
3. Rename the class
4. Update tests
5. Verify compilation

## Configuring Agent Behavior

### System Prompts for Agents

```bash
claude --system-prompt "You are a careful code reviewer. Always explain your reasoning before making changes."
```

### With CLAUDE.md

```markdown
# Agent Instructions

When working autonomously:
1. Always create a backup before editing
2. Run tests after each change
3. Stop and ask if you encounter unexpected errors
```

## Monitoring Agent Actions

### Verbose Mode

```bash
# See all tool calls and decisions
claude --verbose "Refactor the auth module"
```

### Output to File

```bash
# Log agent actions for review
claude -p "Fix all linting errors" 2>&1 | tee agent-log.txt
```

## Safety Best Practices

1. **Start with read-only tools** - Let Claude explore before granting write access
2. **Use git** - Easy rollback if something goes wrong
3. **Set boundaries** - Be explicit about what Claude shouldn't do
4. **Review changes** - Use `git diff` before committing
5. **Test in isolation** - Use a branch for major refactoring

## Example Agent Session

```
$ claude --allowedTools "Read,Glob,Grep,Edit,Write"

> Find all deprecated functions and update them to use the new API

I'll search for deprecated markers and update each one.

[Searching for @deprecated annotations...]
Found 5 deprecated functions.

[Reading src/utils/oldApi.ts...]
[Editing src/utils/oldApi.ts...]
Updated deprecatedFunction1 to use newApi()

[Reading src/services/legacy.ts...]
[Editing src/services/legacy.ts...]
Updated deprecatedFunction2 to use modernService()

...

Done! Updated 5 functions. Run `git diff` to review changes.
```

## Next Steps

1. Try an autonomous task with read-only tools first
2. Gradually expand permissions as you gain trust
3. Continue to Segment 4 to learn about Skills
