# Claude Code Hooks: Guardrails for Agentic Systems

Hooks are shell commands that Claude Code runs automatically in response to
events — before a tool runs, after a tool runs, or when a session ends. Think
of them as **middleware for your AI pair programmer**: they intercept actions,
enforce policies, and observe behavior — all without modifying the AI itself.

## Why Hooks Matter

When you let an AI agent operate in your codebase, you need **programmatic
guardrails** that go beyond "asking nicely in the prompt." Hooks give you:

| Concern | Without Hooks | With Hooks |
|---------|---------------|------------|
| Destructive commands | Hope the model says no | **Blocked before execution** |
| Code formatting | Remind Claude every time | **Automatic after every edit** |
| Audit trail | Manually check git log | **Real-time tool usage log** |
| Console.log in production | Catch in code review | **Flagged the instant it's written** |
| Session awareness | Scroll through history | **Summary printed on exit** |

## The Three Hook Types

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Claude Code Hook Lifecycle                       │
│                                                                      │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐        │
│   │ PreToolUse  │ ───► │  Tool Runs  │ ───► │ PostToolUse │        │
│   │             │      │             │      │             │        │
│   │ Can BLOCK   │      │ (Read, Bash │      │ Can WARN    │        │
│   │ (exit 2)    │      │  Edit, etc) │      │ (exit 0)    │        │
│   └─────────────┘      └─────────────┘      └─────────────┘        │
│                                                                      │
│   ┌─────────────┐                                                    │
│   │    Stop     │  Runs when the Claude Code session ends            │
│   └─────────────┘                                                    │
└──────────────────────────────────────────────────────────────────────┘
```

### PreToolUse

Runs **before** a tool executes. Can **block** the action.

- **Exit 0** — Allow the tool to proceed
- **Exit 2** — Block the tool (stderr message shown to Claude and the user)
- Any other exit — Treated as a hook error (tool still runs)

### PostToolUse

Runs **after** a tool executes. Cannot block (the action already happened),
but can warn, log, or trigger follow-up actions.

### Stop

Runs when a Claude Code session ends. Useful for summaries, cleanup, and
audit finalization.

## Environment Variables

Every hook receives context via environment variables:

| Variable | Available In | Description |
|----------|-------------|-------------|
| `TOOL_NAME` | Pre & Post | Tool that is/was used (`Read`, `Bash`, `Edit`, etc.) |
| `TOOL_INPUT` | Pre & Post | JSON string of the tool's parameters |
| `TOOL_OUTPUT` | Post only | JSON string of the tool's result |
| `SESSION_ID` | All | Current session identifier |

## The Hooks in This Directory

### 1. safety-guard.sh — PreToolUse (Matcher: `Bash`)

**The bouncer.** Intercepts shell commands before they run and blocks
dangerous patterns:

- `git push --force`, `git reset --hard`, `git clean -fd`
- `rm -rf /`, `rm -rf ~`, `rm -rf ..`
- Commands that cat/echo `.env`, `.pem`, or `.key` files

```
You:   "Force push this to main"
Claude: tries to run `git push --force origin main`
Hook:   🛑 BLOCKED — prints teaching explanation
Claude: "I can't force push — the safety hook blocked it. Here's a safer approach..."
```

**Key lesson:** Exit code 2 is the "deny" signal. The hook writes the
reason to stderr, and Claude sees it — the model can then explain the
block and suggest alternatives.

### 2. tool-logger.sh — PostToolUse (Matcher: all tools)

**The flight recorder.** Logs every tool call with timestamp and details
to `.claude/logs/tool-usage.log`.

After a session, you can review exactly what Claude did:

```
[2026-03-18 14:22:01] Read — "file_path":"src/utils/client.ts"
[2026-03-18 14:22:03] Grep — "pattern":"console\\.log"
[2026-03-18 14:22:05] Edit — "file_path":"src/utils/client.ts"
[2026-03-18 14:22:05] Bash — "command":"npm test"
```

**Key lesson:** Observability is non-negotiable in agentic systems. You
should always be able to answer "what did the agent do and why?"

### 3. auto-format.sh — PostToolUse (Matcher: `Edit|Write`)

**The style enforcer.** Runs Prettier (JS/TS) or Ruff/Black (Python) on
any file Claude creates or modifies.

**Key lesson:** Don't rely on the AI to format correctly — enforce it
with tooling. This is the same principle behind CI formatters, applied
at the agent interaction layer.

### 4. console-log-detector.sh — PostToolUse (Matcher: `Edit|Write`)

**The code hygiene inspector.** After any JS/TS file is edited, scans for
`console.log` statements and prints a warning with line numbers.

```
⚠️  console.log detected in api-client.ts (2 occurrence(s))
   12:  console.log('debug:', response)
   45:  console.log(user)
```

**Key lesson:** Hooks catch issues at the moment of introduction — not
minutes later in a linter, hours later in review, or days later in
production. The tighter the feedback loop, the better.

### 5. session-summary.sh — Stop Hook

**The debrief.** When a session ends, prints:

- Git status (modified, staged, untracked files)
- Tool usage statistics (if the tool-logger was active)
- Helpful reminders

**Key lesson:** Agentic sessions can make many changes across many files.
A summary hook ensures nothing gets lost or forgotten.

## How to Install These Hooks

### Option A: Project-Level (Recommended for Learning)

Copy the hooks configuration into your project's `.claude/settings.json`:

```bash
# From the repo root:
cp hooks/hooks-settings-template.json .claude/settings.json
```

Or merge into an existing settings file — add the `"hooks"` key from
[hooks-settings-template.json](hooks-settings-template.json).

### Option B: User-Level (Applies to All Projects)

Add to `~/.claude/settings.json` to enable hooks globally. Use absolute
paths to the scripts in that case.

### Option C: Cherry-Pick Individual Hooks

Add only the hooks you want. For example, to enable just the safety guard:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash hooks/scripts/safety-guard.sh"
          }
        ]
      }
    ]
  }
}
```

## Configuration Deep Dive

### The settings.json Structure

```jsonc
{
  "hooks": {
    "PreToolUse": [           // Hook type (when it fires)
      {
        "matcher": "Bash",    // Which tool(s) trigger this hook
                              //   "" or omitted = ALL tools
                              //   "Bash" = only Bash tool
                              //   "Edit|Write" = Edit or Write
        "hooks": [
          {
            "type": "command",           // Currently the only type
            "command": "bash script.sh"  // Shell command to run
          }
        ]
      }
    ]
  }
}
```

### Matcher Patterns

| Matcher | Triggers On |
|---------|-------------|
| `""` (empty) | Every tool call |
| `"Bash"` | Only the Bash tool |
| `"Edit\|Write"` | Edit or Write tools |
| `"Read"` | Only the Read tool |

### Exit Codes (PreToolUse Only)

| Exit Code | Meaning |
|-----------|---------|
| `0` | Allow — tool proceeds normally |
| `2` | **Block** — tool is prevented, stderr shown to Claude |
| Other | Hook error — tool proceeds, error is logged |

PostToolUse and Stop hooks always proceed regardless of exit code.

## Writing Your Own Hooks

### Starter Template

```bash
#!/usr/bin/env bash
# my-hook.sh — [PreToolUse|PostToolUse|Stop] Hook
# Description: What this hook does

# Access context via environment variables
echo "Tool: $TOOL_NAME"
echo "Input: $TOOL_INPUT"

# Your logic here...

# For PreToolUse:
#   exit 0  → allow
#   exit 2  → block (print reason to stderr)
# For PostToolUse / Stop:
#   exit 0  → always (return code doesn't block)

exit 0
```

### Ideas for Custom Hooks

| Hook | Type | What It Does |
|------|------|-------------|
| **Cost tracker** | PostToolUse | Estimate API cost per tool call |
| **Branch protector** | PreToolUse | Block commits to main/production |
| **Test runner** | PostToolUse | Run related tests after file edits |
| **Slack notifier** | Stop | Post session summary to a channel |
| **Dependency checker** | PostToolUse | Flag new imports of banned packages |
| **File size guard** | PreToolUse(Write) | Block creation of files over N lines |

## Exercises for Learners

### Exercise 1: Observe the Agent

1. Install the `tool-logger` hook
2. Ask Claude to refactor a function in this project
3. After the session, review `.claude/logs/tool-usage.log`
4. **Question:** How many tool calls did Claude make? Was it efficient?

### Exercise 2: Build a Guardrail

1. Write a PreToolUse hook that blocks `npm install` of packages not in
   an allowlist
2. Test it by asking Claude to add a new dependency
3. **Question:** How does Claude respond when blocked? Does it find an
   alternative?

### Exercise 3: Quality Gate

1. Write a PostToolUse hook that runs `npm test` after any `.ts` file
   is edited
2. Ask Claude to make a change that breaks a test
3. **Question:** Does Claude notice the test failure from the hook output
   and fix it automatically?

### Exercise 4: Combine Hooks

1. Enable all five hooks from this directory
2. Have a normal coding session with Claude
3. Review the session summary and tool log
4. **Question:** Which hook provided the most value? Which was noisiest?

## Key Takeaways

1. **Hooks are deterministic guardrails** — they run the same way every
   time, unlike prompt-based instructions which can be ignored or forgotten.

2. **Exit code 2 is powerful** — it gives you a hard veto over any tool
   call, with the ability to explain why.

3. **PostToolUse hooks create tight feedback loops** — catching issues at
   the moment of creation, not during review.

4. **Observability is foundational** — you can't govern what you can't see.
   The tool logger should be your first hook.

5. **Hooks compose** — multiple hooks on the same event run in order. Build
   small, focused hooks and combine them.

## Further Reading

- [Claude Code Hooks Documentation](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Segment 4: Skills and Agents](../segment_4_skills_agents/01_skills_intro.md)
  — Hooks can be defined inside skill frontmatter too
