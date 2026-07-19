# Segment 2 - CLAUDE.md at Every Scope Demo Punchlist

Live demo script for O'Reilly "Claude Code and Large-Context Reasoning," Segment 2 (Context).

**Goal:** show learners that **scope** is the missing variable. The *same* prompt gets *different* answers depending on which CLAUDE.md applies - and that's a feature, not a bug.

**Prerequisites:**

- [ ] Claude Code CLI installed and authenticated
- [ ] Repo cloned at `C:\github\claude-code`
- [ ] Editor (VS Code) able to split-view five files at once

---

## 1. Open the cascade side by side

Open these five files in a split-view layout. Top to bottom, this is the actual order Claude reads them:

```bash
# User scope (your stable identity)
code ~/.claude/CLAUDE.md

# Project scope (this repo)
code C:/github/claude-code/CLAUDE.md

# Subdirectory scopes (loaded on demand)
code C:/github/claude-code/segment_1_quickstart/CLAUDE.md
code C:/github/claude-code/segment_2_context/CLAUDE.md
code C:/github/claude-code/segment_3_agents/CLAUDE.md
code C:/github/claude-code/segment_4_hero/CLAUDE.md
```

**Talking point:** the user file is your *stable identity* (voice, defaults). The project file is your *codebase* (commands, architecture). The subdirectory files are *local rules* (what belongs here, what doesn't). Lower layers don't override - they **add detail**.

**Expected aha:** the user CLAUDE.md says "Node-first, Python-second." The project CLAUDE.md says "but this repo has Python MCP servers managed by UV." The subdirectory CLAUDE.md for `segment_2_context/` says "no MCP topics here - they moved to Segment 4." Each layer narrows the focus without contradicting the one above it.

---

## 2. Pose the same question from inside each segment

Launch Claude Code from inside `segment_1_quickstart/` first:

```bash
cd C:/github/claude-code/segment_1_quickstart
claude
```

Then ask:

```
> I'm going to add a new file in this directory. What language should I use, and what conventions apply?
```

**Expected:** Claude leans on Segment 1's subdirectory rules (TypeScript demos, `npx tsx` to run).

Exit, then repeat from `segment_2_context/`:

```bash
cd C:/github/claude-code/segment_2_context
claude
```

```
> Same question - adding a new file in this directory. What goes where?
```

**Expected:** Claude tells you **not** to add MCP-server-building topics (they moved to Segment 4) and points you at the Segment 2 lesson structure.

Repeat once more from `segment_4_hero/`. Watch the answer flip back toward MCP and production-server patterns.

**Talking point:** you didn't change a prompt. You changed *which CLAUDE.md was in scope*. That's the whole game.

---

## 3. Show the `@path/file.md` import in action

Inside Claude Code at the repo root:

```
> Open my user CLAUDE.md and tell me which @-imports it pulls in. Then read one of those rule files and summarize what it adds to your behavior.
```

**Expected:** Claude lists the imports from `~/.claude/CLAUDE.md` (`rules/agents.md`, `rules/coding-style.md`, `rules/git-workflow.md`, `rules/hooks.md`, `rules/patterns.md`, `rules/performance.md`, `rules/security.md`, `rules/testing.md`) and summarizes one of them on demand.

**Talking point:** the user CLAUDE.md stays short and readable. The detail lives in focused, diff-friendly rule files. Same trick works for project CLAUDE.md once it crosses ~200 lines.

---

## 4. Break the cascade on purpose (optional teaching moment)

Temporarily rename a subdirectory CLAUDE.md so it doesn't load:

```bash
git -C C:/github/claude-code mv segment_2_context/CLAUDE.md segment_2_context/_CLAUDE.md.disabled
```

Re-run the question from Step 2 inside `segment_2_context/`. Watch Claude lose the "no MCP topics here" guardrail and happily start drafting MCP scaffolding inside Segment 2.

**Restore it:**

```bash
git -C C:/github/claude-code mv segment_2_context/_CLAUDE.md.disabled segment_2_context/CLAUDE.md
```

**Talking point:** the subdirectory CLAUDE.md is doing real work. Lose it and Claude doesn't fail noisily - it just drifts.

---

## 5. Wrap with the punchline

Back in the lesson view:

```
> In one sentence, what is context engineering?
```

**Expected ground truth (or close to it):** "Context engineering is disciplined CLAUDE.md authoring at the right scope, with `@path/file.md` imports keeping each file focused."

---

## Demo Talking Points

1. **Three scopes, one cascade.** User, project, subdirectory. Top to bottom. Each layer adds detail.
2. **Subdirectory CLAUDE.md is on-demand.** It loads when Claude touches files under that subtree, not when the session starts.
3. **`@path/file.md` is your friend.** Big CLAUDE.md files become unreadable. Split them.
4. **Drift is silent.** If a subdirectory CLAUDE.md is missing, Claude doesn't error - it guesses. The rest of this course is about reducing that guess space.
5. **Next up - Segment 3:** memory only matters if Claude can act on it. We'll let it act, with bounded agents.
