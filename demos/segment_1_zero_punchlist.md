# Segment 1 (Zero) — Live Demo Punchlist

Live demo script for O'Reilly "Claude Code and Large-Context Reasoning" — Segment 1: Zero.

**Goal:** Show learners that Claude is stateless, and that a 10-line `CLAUDE.md` is the cheapest, highest-leverage fix.

**Prerequisites:**
- [ ] Node.js 20+ installed
- [ ] `ANTHROPIC_API_KEY` exported in current shell
- [ ] A scratch directory (not the course repo — we want a clean stage)

---

## 1. Verify the install

```bash
# Confirm Claude Code is on PATH and current
claude --version
```

**Expected output:** A semver line like `1.x.x` (no error, no "command not found").

**If it fails:** `npm install -g @anthropic-ai/claude-code`, then re-run.

**Teaching point:** This is the only setup step. No daemon, no service, no login flow beyond the API key.

---

## 2. Start the REPL in a project with no context

```bash
# Brand new scratch directory — nothing for Claude to read
mkdir /tmp/zero-demo && cd /tmp/zero-demo
git init -q
echo "console.log('hello')" > index.js

# Start Claude
claude
```

**In the REPL:**

```text
> what is this project?
```

**Expected behavior:** Claude reads what files exist (`index.js`), guesses from the one line of code, and hedges. It has no idea what the project is *for*, who built it, or what conventions matter.

**Teaching point:** This is the **stateless baseline**. Claude is smart, but it cannot read your mind.

---

## 3. Exit and write a 10-line CLAUDE.md

```text
> [Ctrl+D]
```

Back at the shell, drop a minimal `CLAUDE.md` in the project root:

```bash
cat > CLAUDE.md << 'EOF'
# Zero Demo

A throwaway project for the O'Reilly Segment 1 demo.

## What this is
A one-file Node.js script used to demonstrate how Claude Code
reads CLAUDE.md before answering project questions.

## Conventions
- Node.js 20+, no TypeScript, no build step
- Single file: index.js
- Run with: `node index.js`
EOF
```

**Teaching point:** Ten lines. No SDK. No tool. No config. **Just a file in the repo root.**

---

## 4. Restart Claude and ask the same question

```bash
claude
```

**In the REPL:**

```text
> what is this project?
```

**Expected behavior:** Claude now answers with specifics from `CLAUDE.md` — "throwaway project for the O'Reilly Segment 1 demo," names the conventions, names the run command.

**Optional follow-up to drive the point home:**

```text
> how do I run it?
```

Claude returns `node index.js` because we told it. Without `CLAUDE.md` it would have guessed `node` *or* `npm start` *or* asked.

**Teaching point:** Same prompt, same model, same code. The only thing that changed was a file on disk. **That file is the memory spine for everything else in this course.**

---

## 5. Commit it

```bash
git add CLAUDE.md
git commit -m "Add CLAUDE.md so Claude stops guessing"
```

**Teaching point:** `CLAUDE.md` is versioned, reviewed, and travels with the repo. Every teammate (and every future Claude session) gets the same baseline. **No setup. No onboarding doc. No Slack thread.**

---

## Demo Talking Points

1. **Stateless by default** — Claude does not "learn" your project between sessions. Every turn re-reads disk.
2. **`CLAUDE.md` is not magic** — it's just markdown that gets prepended to context. You can read it, diff it, blame it.
3. **Smallest useful version is ~10 lines** — what is this, how do I run it, what conventions matter. Resist the urge to write a novel.
4. **It belongs in git** — team-shared, reviewable, version-controlled. Not a `~/.claude` user-level file.
5. **This is the memory spine for the rest of the course** — Segments 2 (Context), 3 (Agents), and 4 (Hero) all build on top of `CLAUDE.md`.

---

## Quick Recovery Commands

If something breaks mid-demo:

```bash
# Wipe the scratch dir and start over
rm -rf /tmp/zero-demo

# Confirm install still works
claude --version

# Check that ANTHROPIC_API_KEY is still set
echo "${ANTHROPIC_API_KEY:0:10}..."
```

---

## Cleanup After Demo

```bash
# Nuke the scratch dir
rm -rf /tmp/zero-demo
```
