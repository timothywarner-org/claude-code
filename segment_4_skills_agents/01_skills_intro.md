# Skills and Custom Slash Commands

Skills extend Claude Code with reusable capabilities and workflows.

## What are Skills?

Skills are custom slash commands that:

- Define reusable prompts and workflows
- Can be invoked with `/project:skill-name`
- Support dynamic arguments
- Combine with agents for powerful automation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Skills System                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   User types: /project:review                                            │
│                    │                                                     │
│                    ▼                                                     │
│   ┌─────────────────────────────────┐                                   │
│   │  .claude/commands/review.md     │                                   │
│   │  ─────────────────────────────  │                                   │
│   │  Review the current changes     │                                   │
│   │  focusing on:                   │                                   │
│   │  1. Security issues             │                                   │
│   │  2. Performance problems        │──────► Claude executes            │
│   │  3. Missing tests               │        the workflow               │
│   └─────────────────────────────────┘                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Creating Skills

### Step 1: Create Commands Directory

```bash
mkdir -p .claude/commands
```

### Step 2: Create a Skill File

Create `.claude/commands/review.md`:

```markdown
Review the changes in the current branch:

1. Run `git diff main...HEAD`
2. Analyze each changed file for:
   - Security vulnerabilities
   - Performance issues
   - Missing error handling
   - Code style violations
3. Provide actionable feedback
4. Suggest improvements with code examples
```

### Step 3: Use the Skill

```bash
claude
> /project:review
```

## Skill Examples

### Code Review Skill

`.claude/commands/review.md`:

```markdown
Perform a comprehensive code review:

1. Get the diff: `git diff main...HEAD`
2. For each changed file, check:
   - Security: SQL injection, XSS, auth issues
   - Performance: N+1 queries, unnecessary loops
   - Style: Consistent naming, proper types
   - Tests: Coverage for new code
3. Rate severity: critical, warning, suggestion
4. Provide specific line references
```

### Fix Issue Skill

`.claude/commands/fix-issue.md`:

```markdown
Fix GitHub issue #$ARGUMENTS

1. Read the issue details
2. Understand the root cause
3. Implement the fix
4. Write tests for the fix
5. Create a descriptive commit message
```

Usage: `/project:fix-issue 123`

### Deploy Skill

`.claude/commands/deploy.md`:

```markdown
Prepare for deployment:

1. Run the test suite
2. Check for uncommitted changes
3. Verify branch is up to date
4. Build the project
5. Run linting
6. Report any issues found

If all checks pass, output the deploy command.
```

### Generate Docs Skill

`.claude/commands/docs.md`:

```markdown
Generate documentation for $ARGUMENTS

1. Find the file or module
2. Read the source code
3. Generate JSDoc comments for functions
4. Create a README section with:
   - Overview
   - Usage examples
   - API reference
5. Output the documentation
```

Usage: `/project:docs src/api`

## Skills with Arguments

Use `$ARGUMENTS` for dynamic input:

`.claude/commands/refactor.md`:

```markdown
Refactor the component: $ARGUMENTS

1. Read the current implementation
2. Identify improvement opportunities
3. Apply the following patterns:
   - Extract repeated logic
   - Use composition over inheritance
   - Add proper TypeScript types
4. Ensure tests still pass
```

Usage: `/project:refactor UserProfile`

## Combining Skills with Agents

### Agentic Skill Workflow

`.claude/commands/full-review.md`:

```markdown
Perform a full code review and fix workflow:

## Phase 1: Analysis
1. Get all changes with `git diff main...HEAD`
2. Identify all issues (security, performance, style)

## Phase 2: Fix
3. Fix each issue, starting with critical ones
4. Run tests after each fix

## Phase 3: Cleanup
5. Run linter and fix any issues
6. Update documentation if needed

## Phase 4: Complete
7. Create a summary of all changes
8. Suggest a commit message
```

### Running Skills with Agent Mode

```bash
# Run skill with pre-approved tools
claude --allowedTools "Read,Glob,Grep,Edit,Write"
> /project:full-review
```

## Best Practices

### 1. Be Specific

❌ Bad:
```markdown
Review the code and fix problems.
```

✅ Good:
```markdown
Review the code for:
1. SQL injection vulnerabilities
2. Missing input validation
3. Hardcoded credentials

For each issue found, provide:
- File and line number
- Description of the problem
- Suggested fix with code
```

### 2. Define Success Criteria

```markdown
The refactoring is complete when:
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Linting passes
- [ ] Code coverage unchanged
```

### 3. Handle Errors

```markdown
If tests fail after a change:
1. Identify the failing test
2. Determine if test or code is wrong
3. Fix the appropriate one
4. Re-run tests
```

### 4. Use Step-by-Step

```markdown
Step 1: Search for TODO comments
Step 2: List all findings
Step 3: Prioritize by severity
Step 4: Fix high-priority items first
Step 5: Verify each fix with tests
```

## Sharing Skills

### Team Skills Repository

```bash
# Create a shared skills repo
mkdir team-claude-skills
cd team-claude-skills

# Add skills
cp ~/.claude/commands/*.md ./commands/

# Team members can install
cp -r ./commands ~/.claude/commands/
```

### Project Skills

Include skills in `.claude/commands/` and commit to your repo. Team members get them automatically.

## Built-in Slash Commands

Claude Code also has built-in commands:

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/clear` | Clear conversation |
| `/mcp` | List MCP tools |
| `/project:*` | Your custom skills |

## Next Steps

1. Create a `/project:review` skill for your project
2. Add project-specific skills to `.claude/commands/`
3. Combine skills with agent mode for powerful workflows
4. Share useful skills with your team
