# Skills and Custom Slash Commands

<!-- src: https://code.claude.com/docs/en/skills (May 2026) -->

## Cold open

A **skill** is the answer to "I just typed this exact 12-step prompt for the fourth time." Five lines of YAML and one `` !`git diff HEAD` `` line later, you have a slash command that knows your last change without you typing a word.

Here is the magic trick. Drop this file at `.claude/skills/review-changes/SKILL.md`:

```markdown
---
name: review-changes
description: Review my uncommitted changes for bugs, smells, and missing tests
allowed-tools: Read, Glob, Grep
---

## Current diff
!`git diff HEAD`

## Your task
Review the diff above. Flag bugs, anti-patterns, and missing tests.
Reference specific files and line numbers. Be terse, be honest.
```

Now type `/review-changes` in Claude Code. The `` !`git diff HEAD` `` line **runs at render time**, the output is inlined into the prompt **before Claude sees it**, and you get an instant code review of your current working tree. No arguments. No copy-paste. No "let me look at the diff first" round trip.

That is the whole pitch. Everything below is mechanics.

## The mental model

A skill is a **parameterized, reusable prompt** that Claude can either invoke automatically (when your natural-language request matches the skill's `description`) or that you can invoke explicitly with `/<name>`. Three superpowers separate a skill from a plain prompt:

1. **Arguments**: `$ARGUMENTS` (full string), `$1` / `$2` (positional, shell-quoted), or named arguments declared in frontmatter
2. **Dynamic context injection**: `` !`<bash>` `` at line start or after whitespace; multi-line via a ` ```! ` fenced block. Output is inlined **before** Claude sees the prompt. This is preprocessing, not tool use
3. **Forked context**: `context: fork` runs the skill in an isolated subagent so the main conversation only sees the summary, not the 40 file reads it took to produce one

Same control hierarchy as MCP (which you will meet at the end of this segment): tools are model-controlled, resources are app-controlled, prompts are user-controlled. Skills slot into all three depending on frontmatter.

## The demo

Live walkthrough lives in `demos/segment_4_hero_punchlist.md`. We will build the `/review-changes` skill, run it, then chain it with the `code-quality-coach` subagent, then reach into Microsoft Learn over MCP.

## Try it now

The full hands-on exercise (build a skill, wire it to an agent, ship it through GitHub Actions) is in `tests/segment_4_production/exercise_1_github_actions.md`. Start there after the demo.

## Check your understanding

1. What is the difference between `` !`git diff HEAD` `` inside a skill and asking Claude "please run `git diff HEAD`"? (Hint: one is preprocessing, one is tool use.)
2. When would you set `context: fork` on a skill, and what does the main conversation lose if you do?
3. You want a skill that only **you** can trigger, never Claude on its own. Which frontmatter field?

Skills make Claude **faster**. Subagents make Claude **parallel**. MCP makes Claude **reach**. Last topic, then we close out.

---

## Reference: where skills live (priority order)

| Scope | Path | Applies to |
|-------|------|------------|
| Enterprise | Managed settings | All users in your org |
| Personal | `~/.claude/skills/<name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<name>/SKILL.md` | This project only |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Wherever the plugin is enabled |

Same name across scopes? Enterprise overrides personal, personal overrides project. Plugin skills are namespaced (`plugin-name:skill-name`) so they cannot collide.

> **May 2026 change**: custom slash commands have **merged with skills**. A file at `.claude/skills/deploy/SKILL.md` and a legacy file at `.claude/commands/deploy.md` both create `/deploy`. The `.claude/commands/` form still works for backward compatibility, but **`.claude/skills/<name>/SKILL.md` is canonical** and unlocks supporting files, frontmatter, and dynamic context injection.

## Reference: frontmatter fields

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Skill identifier (lowercase, hyphens, max 64 chars). Defaults to directory name. | `code-review` |
| `description` | When Claude should auto-load this skill. Truncated at 1,536 chars; put the key trigger first. | `Review PRs and staged changes` |
| `when_to_use` | Extra trigger phrases. Appended to `description`. | `User asks "review my code"` |
| `disable-model-invocation` | If `true`, only you can invoke it. | `true` for `/deploy`, `/commit` |
| `user-invocable` | If `false`, only Claude can invoke it. | `false` for pure reference skills |
| `allowed-tools` | Tools the skill may use without permission prompts. | `Read, Glob, Bash(git:*)` |
| `argument-hint` | Autocomplete hint. | `[branch] [--dry-run]` |
| `arguments` | Named positional arguments for `$name` substitution. | `[issue, branch]` |
| `model` | Override model. | `claude-sonnet-5` |
| `effort` | `low`, `medium`, `high`, `xhigh`, `max`. | `high` |
| `context` | `fork` runs the skill in an isolated subagent. | `fork` |
| `agent` | Subagent type when forking. | `Explore`, `Plan`, `general-purpose` |
| `paths` | Glob patterns that limit auto-load. | `src/**/*.ts` |
| `hooks` | Pre/post tool execution hooks. | See hooks section |
| `shell` | `bash` (default) or `powershell` for `` !`cmd` ``. | `powershell` |

## Reference: argument substitutions

| Variable | Meaning |
|----------|---------|
| `$ARGUMENTS` | The full argument string as typed |
| `$1`, `$2`, ... | Positional arguments (shell-style quoting) |
| `$name` | Named argument (requires `arguments:` in frontmatter) |
| `${CLAUDE_SESSION_ID}` | Current session ID, useful for log files |
| `${CLAUDE_EFFORT}` | Active effort level |
| `${CLAUDE_SKILL_DIR}` | Absolute path to this skill's directory. Use this for bundled scripts so the path resolves under any scope |

## Anatomy of a production skill

```
code-review/
├── SKILL.md              # Main file with frontmatter (REQUIRED)
├── SECURITY_CHECKLIST.md # Supporting reference Claude can load when needed
├── PERFORMANCE_GUIDE.md
└── scripts/
    ├── security_scan.py  # Use ${CLAUDE_SKILL_DIR}/scripts/... in SKILL.md
    └── lint_check.py
```

The repo already ships an example worth reading: `.claude/skills/mcp-scaffold/` (Python MCP server scaffolding with templates, validators, references).

## Worked example: skill that forks into an Explore subagent

```yaml
---
name: deep-research
description: Research a topic thoroughly across the codebase
context: fork
agent: Explore
allowed-tools: Read, Glob, Grep
model: claude-sonnet-5
---

Research $ARGUMENTS thoroughly:

1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

`/deep-research authentication flow` spawns an Explore agent in a fresh context. Your main session sees only the final summary, not the 40 file reads.

## Worked example: skill with multiple dynamic context injections

```yaml
---
name: pr-summary
description: Summarize the current pull request
allowed-tools: Bash(gh *)
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize the PR. Flag risks. Suggest reviewers.
```

Three `gh` commands run at render time. Claude only sees the rendered prompt with real PR data inlined.

## Tool restrictions

```yaml
allowed-tools: Read, Glob, Grep, Bash(git:*, npm:test)
```

| Pattern | Meaning |
|---------|---------|
| `Read` | Allow Read tool |
| `Bash(git:*)` | Allow Bash only for git commands |
| `Bash(npm:test)` | Allow only `npm test` |
| `Bash(python:*)` | Allow Python script execution |

## Skills vs legacy custom commands

| Feature | Skills (`.claude/skills/<name>/SKILL.md`) | Legacy Commands (`.claude/commands/<name>.md`) |
|---------|--------------------------------------------|-------------------------------------------------|
| Status | **Canonical, recommended** | Backward-compatible only |
| Supporting files (scripts, refs, templates) | Yes | No |
| Frontmatter (`context: fork`, `paths`, ...) | Full set | Limited subset |
| Auto-load by Claude when description matches | Yes | Limited |
| Dynamic context injection (`` !`cmd` ``) | Yes | No |
| Run in isolated subagent context | Yes (`context: fork`) | No |
| Invocation | `/<name>` | `/<name>` |

> Use `.claude/skills/` for everything new. To migrate, rename the file to `SKILL.md`, move it into a subdirectory named after the command, and you can immediately start using the new fields.

## Best practices

1. **Specific descriptions.** `Run security scans on code changes, PRs, or before deployment` beats `Help with code`. The description is how Claude decides whether to auto-load.
2. **Progressive disclosure.** Keep `SKILL.md` short. Push detail into sibling reference files Claude can read when needed.
3. **Portable scripts.** Use `${CLAUDE_SKILL_DIR}` so paths resolve under any scope. Output JSON. Exit with proper codes.
4. **Document arguments.** `argument-hint: "[branch|file|--staged] [--dry-run]"`.
5. **Test thoroughly.** Vary arguments. Test error paths. Try on a clean repo.

## Sharing skills

- **Team**: commit `.claude/skills/` to the repo. Teammates get them when they trust the workspace.
- **Personal**: drop in `~/.claude/skills/` to use across all projects.
- **Plugins**: distribute as part of a Claude Code plugin. Plugin skills use a `plugin-name:skill-name` namespace.

## Next

1. Walk the punchlist in `demos/segment_4_hero_punchlist.md`
2. Do `tests/segment_4_production/exercise_1_github_actions.md`
3. Move on to `04_mcp_consumption.md` for the segment closer
