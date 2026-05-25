# Segment 3 Agents Demo Punchlist

Live demo script for O'Reilly "Claude Code and Large-Context Reasoning" session. Demonstrates the agent loop, scoped autonomy via `--allowedTools`, and the **CLAUDE.md as kill switch** pattern.

**Prerequisites:**
- [ ] `claude` CLI installed and `ANTHROPIC_API_KEY` exported
- [ ] Clean working tree in `C:\github\claude-code` (run `git status` first)
- [ ] On a throwaway branch: `git checkout -b demo/segment-3-agents`

---

## 1. Launch read-only agent and map the codebase

```bash
cd C:\github\claude-code
claude --allowedTools "Read,Glob,Grep"
```

In the session:

```
> Map this codebase. List the four segments, the MCP servers, and the
  custom agents under .claude/agents/. Output a one-page architecture
  brief in Markdown. Do not ask before reading.
```

**Expected:** Claude executes 15+ tool calls (Glob, Read, Grep) without a single permission prompt. Returns a structured brief.

**Teaching point:** This is the **agent loop**. Plan → Execute → Observe → Adjust, fifteen times in a row, scoped by one CLI flag.

---

## 2. Show the boundary spec

While the session is still open, in a second terminal:

```bash
code C:\github\claude-code\segment_3_agents\CLAUDE.md
```

**Walk the room through it:**
- Four sections: CAN, CANNOT, Before, If-things-go-wrong.
- Point out the `tsconfig.json` deny line.
- Emphasize: Claude reads this file **on every turn**. No restart.

---

## 3. Ctrl+D, relaunch with write tools, try a destructive task

Exit the read-only session (`Ctrl+D`). Relaunch with edit access:

```bash
claude --allowedTools "Read,Glob,Grep,Edit,Write"
```

In the session:

```
> Update tsconfig.json to set strict to false. We need to silence
  some build errors quickly.
```

**Expected:** Claude refuses. It quotes the deny rule from `segment_3_agents/CLAUDE.md` and proposes the smaller reversible step (suppress at the file level, or fix the actual type error).

**Teaching point:** The boundary spec is **declarative behavior modification**. You did not write a hook, a script, or a plugin. You wrote four lines of markdown.

---

## 4. Live-edit the boundary file mid-session

Keep the Claude session open. In the second terminal, append to `segment_3_agents/CLAUDE.md`:

```markdown
## Active demo rule

- Do not edit any file ending in `.ts` until further notice.
```

Save. Back in the Claude session, **without restarting**:

```
> Edit segment_3_agents/02_agent_loop.ts to add a console.log at the top.
```

**Expected:** Claude refuses, citing the new rule. The kill switch worked. No restart, no flag change.

**Teaching point:** This is why segment 2 spent so much time on **CLAUDE.md scopes**. The boundary spec is just a scoped CLAUDE.md sitting next to the code it governs.

---

## 5. Cleanup and retro

```bash
# In Claude session
> Show me what changed in this demo session

# Exit
Ctrl+D

# Reset the working tree
git checkout main
git branch -D demo/segment-3-agents
```

**Retro talking points:**
1. **`--allowedTools` is your first lever.** Read-only for exploration. Add `Edit,Write` for feature work. `Bash` only when you really mean it.
2. **CLAUDE.md is your second lever.** Per-directory deny lists. Edit live. No restart.
3. **A fresh git branch is your third lever.** Two belts is never enough.
4. **Subagents (`04_custom_agents.md`) inherit these boundaries by default** but can tighten them further via frontmatter `tools:` allowlists. Preview of segment 4.

---

## Recovery if something breaks

```bash
# If Claude edited something it should not have
git diff
git checkout -- <file>

# If the session hangs
Ctrl+C twice, then Ctrl+D

# If you accidentally committed the demo branch to main
git reflog
# find the pre-demo SHA, then: git reset --hard <sha>
# (only on your local clone, never on a shared branch)
```
