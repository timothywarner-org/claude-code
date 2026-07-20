# Claude Code Memory: a worked example

This folder is a **teaching example** of Claude Code's file-based memory. It is inert - nothing here is loaded as live memory. It exists so you can see the shape of a real memory store side by side and copy the pattern.

## The idea in one paragraph

Claude Code keeps durable facts as **plain markdown files in a memory directory**. One fact per file, each with frontmatter that says what it is and when it applies. A single index file, **`MEMORY.md`**, is loaded into context at the start of every session; it holds one line per fact, so Claude knows what it remembers without reading every file. When a fact becomes relevant, the full file is recalled.

Think of it as a card catalog. `MEMORY.md` is the catalog drawer (one card, one line, points to a book). The individual files are the books.

## What is in this folder

| File | Role |
| --- | --- |
| `MEMORY.example.md` | The index. One line per remembered fact. This is the file loaded every session. |
| `user_prefers_uv.example.md` | A `feedback` memory: guidance the user gave on how to work. |
| `project_azure_keyless.example.md` | A `project` memory: a standing constraint on the current work. |

The `.example.md` suffix is only so this demo does not get mistaken for a live store. Real memory files are plain `.md`.

## The four memory types

| Type | Captures | Example |
| --- | --- | --- |
| `user` | Who the user is: role, expertise, durable preferences | "Principal author, 28 years on the Microsoft stack" |
| `feedback` | How Claude should work, from corrections or confirmed approaches. Include the why. | "Prefer uv over pip" |
| `project` | Ongoing work, goals, constraints not derivable from the code | "This service must stay keyless" |
| `reference` | Pointers to external resources | "Runbook: https://..." |

## The rules that keep it useful

1. **One fact per file.** A file that holds three facts cannot be recalled, updated, or deleted cleanly.
2. **`MEMORY.md` is an index, never content.** One line per memory: `- [Title](file.md) - hook`. Never paste a fact's body into the index.
3. **Link related memories** with `[[slug]]` in the body. Links may point at a memory not written yet; that marks it as worth writing.
4. **Do not save what the repo already records.** Code structure, git history, and `CLAUDE.md` are not memories. Save what was non-obvious.
5. **Convert relative dates to absolute.** "Last week" rots; "2026-07-13" does not.
6. **Recalled memories reflect what was true when written.** If one names a file or flag, verify it still exists before acting on it.

## How it differs from CLAUDE.md

`CLAUDE.md` is **authored** guidance you write and commit. Memory is **accumulated** fact Claude writes as it learns how you work. `CLAUDE.md` ships with the repo for everyone; memory is per-user and grows across sessions. They complement each other: a convention stable enough for the whole team belongs in `CLAUDE.md`; a preference Claude picked up from your feedback belongs in memory.

Open `MEMORY.example.md` next, then the two files it points to.
