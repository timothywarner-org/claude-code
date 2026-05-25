# Segment 4 (Hero) — Live Demo Punchlist

Live demo script for O'Reilly "Claude Code and Large-Context Reasoning" — Segment 4: Hero (Skills, Subagents, MCP Consumption).

**Goal:** In one continuous demo, show the three reach mechanisms — a **skill** that injects `git diff HEAD`, a **subagent** that adds expert constraint, and an **MCP server** that pulls live Microsoft Learn docs into the conversation.

**Prerequisites:**
- [ ] Claude Code on PATH (`claude --version` returns a semver)
- [ ] `ANTHROPIC_API_KEY` exported
- [ ] You are in the course repo: `cd /c/github/claude-code`
- [ ] Working tree has at least one uncommitted change so `git diff HEAD` is non-empty (if not, edit any file)
- [ ] `.claude/settings.json` registers `microsoft-learn` (or it is in user-scope MCP config)

---

## 1. Build the `/review-changes` skill (Skill + dynamic context injection)

```bash
# From repo root
mkdir -p .claude/skills/review-changes
```

Create `.claude/skills/review-changes/SKILL.md`:

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

**In Claude Code:**

```text
> /review-changes
```

**Expected behavior:** Claude returns a code review of your **actual current diff** without you typing the diff. The `` !`git diff HEAD` `` ran at render time, output was inlined before Claude saw the prompt.

**Teaching point:** This is **preprocessing, not tool use**. Claude never called Bash. The CLI executed the command and stuffed the output into the prompt before sending it. That is the fastest path to "Claude knows what I am working on right now."

---

## 2. Promote the review to an expert (Subagent)

The repo ships a subagent at `.claude/agents/code-quality-coach.md`. Inspect it:

```bash
cat .claude/agents/code-quality-coach.md | head -20
```

**Teaching point:** A subagent is a markdown file with a system prompt and an `allowed-tools` constraint. The frontmatter is similar to a skill, but the file lives in `.claude/agents/` and Claude treats it as a **delegate**, not a workflow.

**In Claude Code:**

```text
> Use the code-quality-coach agent to deep-review my uncommitted changes.
  Focus on test coverage gaps and immutability violations.
```

**Expected behavior:** Claude spins up the `code-quality-coach` subagent in an isolated context. The subagent reads files, applies its system prompt, and returns a focused review. Your main conversation gets the summary, not the file-read churn.

**Teaching point:** Subagents are **parallel reasoning** plus **scoped tool access**. Spin up three at once for a security review, a perf review, and a style review — they do not interfere with each other because each runs in its own context window.

---

## 3. Reach outside the repo (MCP consumption)

The repo's `.claude/settings.json` registers the **microsoft-learn** HTTP MCP server. Confirm it is wired:

```bash
claude mcp list
```

**Expected output:** A line for `microsoft-learn` showing HTTP transport pointing at `https://learn.microsoft.com/api/mcp`.

**Inside the Claude Code session:**

```text
> /mcp
```

**Expected behavior:** Server browser opens. Pick `microsoft-learn`. You see three tools: `microsoft_docs_search`, `microsoft_code_sample_search`, `microsoft_docs_fetch`.

**Now ask a question that requires current information:**

```text
> Using the microsoft-learn MCP server, what is the current GA version of
  the Azure Kubernetes Service API, and what shipped in the most recent
  AKS release? Cite the doc URLs you used.
```

**Expected behavior:** Claude calls `microsoft_docs_search` (breadth), maybe `microsoft_docs_fetch` (depth), and returns an answer with **real URLs from learn.microsoft.com**. Watch the tool-call indicators in the output.

**Comparison move (do this if time allows):**

```text
> Same question, but do NOT use any MCP server. Answer from your training data only.
```

**Expected behavior:** Hedging, "as of my knowledge cutoff," and a version number that may be months stale.

**Teaching point:** MCP is **reach**. Your CLAUDE.md cannot tell Claude what shipped last week. Microsoft Learn's HTTP MCP server can.

---

## 4. Compose: skill + subagent + MCP in one move

Final flourish to show the three reach mechanisms in one continuous chain:

```text
> Use the code-quality-coach agent to review my uncommitted changes.
  If any change touches Azure SDK code, query the microsoft-learn MCP
  server for the current API version of the affected service and flag
  any deprecation. Use /review-changes as your starting context.
```

**Expected behavior:** Claude invokes the skill (gets the diff), delegates to the subagent (does the review), and during the review the subagent calls the MCP server (gets live Azure context). All three reach mechanisms in one prompt.

**Teaching point:** Skills, subagents, and MCP servers are **composable**. They are not three separate features — they are one system with three control surfaces.

---

## 5. Capstone pointer

```bash
cat tests/segment_4_production/capstone_project.md
```

**Teaching point:** The capstone has learners build their own skill + subagent + MCP integration end to end. Everything in this segment has been preparation.

---

## Demo Talking Points

1. **Skills are preprocessed prompts.** `` !`<bash>` `` runs before Claude sees anything. Not tool use. Not slow. Not a permission round trip.
2. **Subagents are scoped reasoning.** Frontmatter constrains tools; system prompt constrains expertise; isolated context constrains pollution of your main conversation.
3. **MCP is reach.** Spec 2025-11-25, two transports (**stdio**, **Streamable HTTP**), three primitives (**tools**, **resources**, **prompts**). SSE-only is retired.
4. **`microsoft-learn` is consumed, not built.** The server is hosted by Microsoft. You connect; you do not run.
5. **Optional next step**: `segment_2_context/memory_server/` is a working Python FastMCP server. Build one when you need a primitive nobody else has published.

---

## Quick Recovery Commands

If something breaks mid-demo:

```bash
# Skill not loading? Check the path and frontmatter
ls .claude/skills/review-changes/
cat .claude/skills/review-changes/SKILL.md

# Subagent not found? Confirm it is in .claude/agents/
ls .claude/agents/

# MCP server not responding? Debug mode shows transport errors
claude --mcp-debug

# List all MCP servers across all scopes
claude mcp list
```

---

## Cleanup After Demo

```bash
# Keep the skill — it is genuinely useful
# Keep the subagent — already in repo
# Nothing to tear down on the MCP side; the server is remote
```

---

## Closing line

You started with **one CLAUDE.md**. You end with a system that **remembers, acts, composes, and reaches**. The capstone is `tests/segment_4_production/capstone_project.md`. That is where you make it yours.
