# Claude Code hooks (teaching kit)

Five sample hooks that show every event class Claude Code fires. None of these
are speculative — they all run end-to-end on Windows (Git Bash), macOS, and
Linux as long as `bash` and `jq` are on PATH.

## What's here

| File | Event | What it does | Blocking? |
| --- | --- | --- | --- |
| `scripts/safety-guard.sh` | PreToolUse (Bash) | Denies `rm -rf /`, force-push to main, `--no-verify`, curl-pipe-to-shell, `git reset --hard` | Yes (exit 2) |
| `scripts/tool-logger.sh` | PostToolUse (all tools) | Appends one audit line per tool call to `.claude/logs/tool-usage.log` | No |
| `scripts/auto-format.sh` | PostToolUse (Edit/Write/MultiEdit) | Runs Prettier, Ruff, or `Invoke-Formatter` on the file Claude just touched | No |
| `scripts/console-log-detector.sh` | PostToolUse (Edit/Write/MultiEdit) | Warns when `console.log` survives in JS/TS edits | No (warning only) |
| `scripts/session-summary.sh` | Stop | Prints a scrum-style retro: branch, dirty files, top tools used | No |

## Install

1. Open `.claude/settings.json` (or `~/.claude/settings.json` if you want this
   user-wide instead of project-scoped).
2. Merge the `hooks` block from `hooks-settings-template.json` into it. The
   `_comment` field is for humans only; Claude Code ignores it.
3. Make the scripts executable on macOS/Linux: `chmod +x hooks/scripts/*.sh`.
   On Windows under Git Bash, the `bash` invocation in the template makes the
   exec bit irrelevant.
4. Restart Claude Code so it re-reads `settings.json`.

## Verify

Run `/hooks` inside Claude Code to see the registered handlers. Then trigger
each event:

| Test | How |
| --- | --- |
| `safety-guard` blocks | Tell Claude: "run `git reset --hard HEAD~3`". Hook denies, Claude reports the reason. |
| `tool-logger` writes | Run any tool. Check `.claude/logs/tool-usage.log` for a new line. |
| `auto-format` fires | Have Claude edit a `.ts` file with bad indentation. File is reformatted. |
| `console-log-detector` warns | Have Claude write `console.log('debug')` into a `.ts` file. Warning appears in the next turn. |
| `session-summary` runs | End the session (`/exit` or close the pane). Retro prints to the transcript. |

## Contract reminders

- **Exit 2** on a PreToolUse hook denies the call and surfaces stderr to the
  model. Anything else allows it.
- Hooks receive JSON on stdin: `{ session_id, transcript_path, cwd,
  hook_event_name, tool_name, tool_input, tool_response? }`.
- `CLAUDE_PROJECT_DIR` is set by the harness to the absolute repo root. Use it
  instead of `$PWD` if your hook might run from a subdirectory.
- Stop hooks should `cat >/dev/null` to drain stdin even if they don't need
  the payload — otherwise a SIGPIPE can show up in your logs.

## Adapting

Each script is small on purpose. Read top to bottom, swap the rules, ship.
The deny list in `safety-guard.sh` is the most useful one to tailor: add the
specific commands your team has been burned by, not the textbook ones.
