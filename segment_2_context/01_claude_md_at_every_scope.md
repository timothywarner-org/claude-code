# Context - CLAUDE.md at Every Scope

## Cold open

You explained your tech stack to Claude on Monday. On Tuesday, you opened a different folder, and Claude was right back to guessing whether you use React or Vue. The fix isn't just one CLAUDE.md - **it's CLAUDE.md at the right scope.**

This segment is the one the whole course rests on. Skills, agents, hooks, MCP - none of them save you from having to tell Claude *who you are, what stack you ship on, and what "done" looks like in this codebase*. CLAUDE.md is how you tell it. And **scope** is how you stop repeating yourself.

## The mental model

Claude reads CLAUDE.md at **three scopes** on every turn:

| Scope             | Path                       | Applies when                            |
| ----------------- | -------------------------- | --------------------------------------- |
| **User**          | `~/.claude/CLAUDE.md`      | Anywhere you run Claude Code            |
| **Project**       | `./CLAUDE.md` (repo root)  | Inside this repository                  |
| **Subdirectory**  | `./<area>/CLAUDE.md`       | When Claude touches files in `<area>/`  |

The cascade, top to bottom:

```
Layer 1: USER          ~/.claude/CLAUDE.md
         (your stable identity: voice, defaults, tech stack)
              |
              v
Layer 2: PROJECT       ./CLAUDE.md
         (this repo: commands, architecture, conventions)
              |
              v
Layer 3: SUBDIRECTORY  ./segment_3_agents/CLAUDE.md
         (loaded on demand when Claude touches files under that subtree)
```

Lower scopes don't *override* higher scopes - they **add detail**. Your user CLAUDE.md says "I default to PowerShell 7 and Node-first." The project CLAUDE.md says "but this repo also has Python MCP servers managed by UV." A subdirectory CLAUDE.md says "and inside `segment_2_context/`, don't add MCP-server-building topics - those moved to `segment_4_hero/`." Each layer narrows the focus.

### The `@path/file.md` import trick

When a CLAUDE.md file gets long enough that you stop reading it, **split it**. Anywhere inside a CLAUDE.md, the syntax:

```markdown
@path/to/other-file.md
```

...inlines that file's content at load time. The repo-root CLAUDE.md can stay short and just import topical rule files:

```markdown
@.claude/rules/coding-style.md
@.claude/rules/security.md
@.claude/rules/git-workflow.md
```

That's exactly the pattern in `~/.claude/CLAUDE.md` - a short spine that imports `rules/agents.md`, `rules/coding-style.md`, `rules/git-workflow.md`, `rules/hooks.md`, `rules/patterns.md`, `rules/performance.md`, `rules/security.md`, `rules/testing.md`. Each one stays focused, and because they're plain files you can version them, diff them, and blame them like any other code.

### Five real CLAUDE.md files in this repo

Open these side by side. They're the worked example for this whole segment:

1. `C:\github\claude-code\CLAUDE.md` - **project root** (~190 lines): commands, architecture, every key directory in the course.
2. `C:\github\claude-code\segment_1_quickstart\CLAUDE.md` - **Segment 1** subtree rules.
3. `C:\github\claude-code\segment_2_context\CLAUDE.md` - **this** segment's CLAUDE.md (yes, you're inside its scope right now).
4. `C:\github\claude-code\segment_3_agents\CLAUDE.md` - **Segment 3** subtree rules.
5. `C:\github\claude-code\segment_4_hero\CLAUDE.md` - **Segment 4** subtree rules.

Lift your eyes one level: **context engineering is just disciplined CLAUDE.md authoring.** Every shiny technique we'll cover later - subagents, custom skills, hooks, MCP servers - still needs context to do its job. The CLAUDE.md hierarchy *is* that context. Get this right and the rest of the course is downhill.

## The demo

Walk through the punchlist live: `demos/segment_2_context_punchlist.md`.

You'll open the five CLAUDE.md files side by side, pose the same flavor of question from inside each segment subdirectory, and watch how the answer shifts based on which subdirectory CLAUDE.md applies. The "aha" moment is seeing Claude switch defaults - Node-first here, Python/UV there - without you re-explaining a thing.

## Try it now

Run the existing exercise at `tests/segment_2_claude_code/exercise_2_code_review.md`. It walks you through a PR-review workflow where CLAUDE.md is the spec that decides what counts as a finding. **The exercise is the proof that CLAUDE.md changes Claude's behavior in measurable ways** - don't skim it.

## Preview: boundaries are CLAUDE.md too

CLAUDE.md isn't just for *style and stack*. You can also use it to scope what an agent is allowed to do - file paths it can edit, commands it can run, what to do when something looks off. Look at `segment_3_agents/03_agent_boundaries.ts` lines 130-165 - there's a `# Agent Boundaries` CLAUDE.md block that scopes a subagent. We'll unpack it in Segment 3. **Memory only matters if Claude can act on it. Next we'll let it act - safely.**

## Check your understanding

1. You ran Claude Code inside `~/projects/api-server/services/auth/`. Three CLAUDE.md files exist: `~/.claude/CLAUDE.md`, `~/projects/api-server/CLAUDE.md`, and `~/projects/api-server/services/auth/CLAUDE.md`. Which ones apply, and in what order do they cascade?
2. Your project's CLAUDE.md is 600 lines and you've stopped reading it. What's the minimum-effort fix that keeps every rule but restores diff-ability?
3. You write "Use Vue 3 with Composition API" in your **user** CLAUDE.md, but a specific repo is locked on React 17. Where do you put the React-17 override, and why doesn't that contradict your user-level default?

## What you should be able to do now

- **Write a multi-scope CLAUDE.md hierarchy** - user, project, and subdirectory - so Claude inherits the right defaults without you repeating yourself.
- **Use `@path/file.md` imports** to split a fat CLAUDE.md into focused, diff-friendly rule files.
- **Predict which CLAUDE.md will apply** in any given subdirectory before you run a single prompt.
