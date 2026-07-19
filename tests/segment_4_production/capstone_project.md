# Capstone Project: A Multi-Scope CLAUDE.md System for Your Own Repo

## Overview

Take the **Zero -> Context -> Agents -> Hero** arc and apply it end to end on a repo you actually own. The deliverable is a system another human can read, audit, and extend - not a one-shot demo.

**Time estimate**: 3-4 hours
**Difficulty**: Advanced
**Prerequisites**: All four segments completed; a real repo to work in (not a scratch directory)

## What you are building

A working, committed **context system** that demonstrates everything the course taught you:

1. A three-scope CLAUDE.md hierarchy with `@path/file.md` imports
2. A boundary-spec CLAUDE.md that defines what Claude may and may not do
3. At least one custom skill that uses **dynamic context injection** (`` !`bash` ``)
4. At least one custom subagent with a constrained tool allowlist and an explicit model choice
5. **Optional advanced track**: build or consume an MCP server, and an automated code-review GitHub Action

Skip the "ship a toy MCP server" reflex - only build one if it earns its place. The point is **a system that makes you faster on a real codebase**, not a demo zoo.

## Part 1 - CLAUDE.md hierarchy (35 points)

Stand up the three-scope cascade in your own repo.

**Required:**

- [ ] A **user-level** `~/.claude/CLAUDE.md` that captures your stable identity (voice, defaults, preferred stack)
- [ ] A **project-level** `CLAUDE.md` at your repo root that captures *this* codebase (commands, architecture, conventions)
- [ ] **At least one subdirectory** `CLAUDE.md` that narrows the rules for one hot zone (e.g. `services/auth/`, `infra/`, `tests/`)
- [ ] Use `@path/file.md` imports to split any CLAUDE.md that crosses ~200 lines into focused rule files
- [ ] Commit all of it. Hierarchy you cannot diff is hierarchy you cannot trust.

**Evidence:**

- Screenshot or transcript showing Claude answering the *same* prompt differently from inside two subdirectories - driven entirely by scope, not by your wording.
- A short `HIERARCHY.md` that lists every CLAUDE.md you added and one sentence explaining what each one owns.

## Part 2 - Boundary-spec CLAUDE.md (15 points)

Apply the Segment 3 lesson to your own repo: a subdirectory CLAUDE.md that defines a real **kill switch**.

**Required:**

- [ ] A `What you CAN do` and `What you CANNOT do` section with at least three rules each
- [ ] Explicit denials for the files and commands that would actually hurt (`.env`, `package-lock.json`, destructive git, anything secret-bearing)
- [ ] A `Before making changes` and `If something goes wrong` section so the recovery path is in writing

**Evidence:**

- One demonstration where Claude refuses a destructive request and cites your CLAUDE.md.
- One demonstration where you edit the boundary spec mid-session and the next tool call respects the new rule. No restart.

## Part 3 - A custom skill with dynamic context injection (20 points)

Build a skill that earns its place because you would type it more than once a week.

**Required:**

- [ ] Lives at `.claude/skills/<your-skill-name>/SKILL.md` (canonical path)
- [ ] Uses at least one `` !`<bash>` `` dynamic context injection - the kind that runs at render time, before Claude sees the prompt
- [ ] Has a `description` field specific enough that Claude can auto-invoke when the trigger phrase appears
- [ ] Has an `allowed-tools` field that restricts to the minimum
- [ ] At least one bundled supporting file (script, reference, or template) loaded via `${CLAUDE_SKILL_DIR}/<file>`

**Evidence:**

- The skill committed to your repo.
- One transcript of you running `/your-skill-name` and getting a useful answer.

**Worked patterns** to crib from: `/review-changes` (Segment 4 cold open), `pr-summary` (multiple `gh` injections), `deep-research` (`context: fork` into an Explore agent).

## Part 4 - A custom subagent (20 points)

Author a subagent in `.claude/agents/<name>.md` that does one job well in an isolated context window.

**Required:**

- [ ] Frontmatter has `name`, `description`, `tools` (constrained), and `model` (explicit, not inherited)
- [ ] The `description` reads like a trigger phrase, not a job title
- [ ] System prompt scopes the agent to a single responsibility (review, mapping, summarization, etc.)
- [ ] At least one of: the agent preloads a skill via `skills:` frontmatter, OR it uses `permissionMode` to set autonomy posture

**Evidence:**

- The agent file committed.
- One transcript showing Claude delegating to it automatically (description-matched) and returning a summary to the main conversation.

## Optional advanced track (up to 20 bonus points)

Pick *zero, one, or both* depending on time. The capstone passes without these.

### Track A: Consume or build an MCP server (10 pts)

Either:

- Register a useful MCP server in `.mcp.json` at the repo root (Microsoft Learn, GitHub, your team's internal one) and demonstrate it answering a question that would otherwise require copy-paste, OR
- Use the `segment_4_hero/memory_server/` FastMCP example as a starting point and ship a server with at least one tool, one resource, and one prompt.

### Track B: Code-review GitHub Action (10 pts)

Wire a GitHub Action that posts an AI code review on every PR. Reuse patterns from `tests/segment_4_production/exercise_1_github_actions.md`.

**Required if you take this track:**

- [ ] Triggers on `pull_request` events
- [ ] Loads relevant files with the right context posture
- [ ] Posts structured review comments back to the PR
- [ ] Handles failures gracefully (rate limits, missing secrets, partial diffs)

## Grading

| Part | Points | Notes |
|------|--------|-------|
| 1. CLAUDE.md hierarchy | 35 | Three scopes + `@-imports` + evidence of scope-driven behavior |
| 2. Boundary spec | 15 | CAN/CANNOT lists + live edit demonstration |
| 3. Custom skill | 20 | Dynamic context injection is required, not optional |
| 4. Custom subagent | 20 | Isolated context + delegation demonstration |
| Track A (MCP) | +10 | Bonus, optional |
| Track B (Action) | +10 | Bonus, optional |
| Code quality | 10 | Clean files, real comments, no toy `foo`/`bar`/`baz` |

## Submission

Push the whole thing to a public (or instructor-accessible) repo and include a top-level `CAPSTONE.md` that:

1. Lists every artifact you shipped, with its path
2. Includes the transcripts/screenshots called out as Evidence above
3. Names one rule in your CLAUDE.md hierarchy you would *change* after using it for a week, and why

The third item is the one that tells the instructor whether you actually used your own system.

## Tips for success

- **Start with the project CLAUDE.md.** Get it right at one scope before fanning out.
- **Write your boundary spec early.** Then put it under test by trying to coax Claude into breaking it.
- **One skill, one subagent.** Resist the urge to ship a dozen. A single skill you actually use beats a fleet of demos.
- **Diff everything.** If your CLAUDE.md isn't in git, it doesn't exist.
- **Commit messages matter.** Use conventional commits. Future-you will read them.

## Frequently asked questions

**Q: Do I have to use Azure/GitHub like the course examples?**
A: No. Use whatever stack your repo runs on. The patterns transfer.

**Q: Can I reuse my company repo?**
A: Yes, provided you can publish your CLAUDE.md and supporting files. If anything is sensitive, fork to a sanitized capstone repo.

**Q: How long should each CLAUDE.md be?**
A: User-level: short and stable. Project-level: a screenful at first, more once you have imports. Subdirectory: long enough to encode the local rules, no longer.

**Q: What if my MCP server idea is just "save a JSON file"?**
A: That is the `memory_server` already in this repo. Build something different or skip Track A.
