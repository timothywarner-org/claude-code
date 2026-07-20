# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What `data/` is

This is the course's **demo fixture library**. Every source file here is a **teaching prop**, not production code and not a bug to fix. The demos in Segments 3 and 4 point Claude at these files to show security review, refactoring, PR review, and MCP memory in action. The files are staged to be found, not corrected.

## The one rule: do not "helpfully" clean these files

The messes are the lesson. When you touch anything in `data/`, treat the defects as **fixtures to demonstrate against**, not defects to remove.

- **`auth_module_messy.py`** ships MD5 password hashing, predictable session tokens, no rate limiting, and an `ADMIN_BACKDOOR_PASSWORD`. All intentional. The `SEC-441/442/443` ticket references and the "sorry about the mess" header are part of the demo narrative.
- **`legacy_payment_processor.py`** carries a `calculate_fees()` nobody understands and Python-2-era patterns. Leave the tech debt in place; it is the refactoring target.
- **`data_pipeline_legacy.py`, `api_handlers_legacy.js`, `context_analysis_sample.js`** are the same shape: staged legacy code for review and refactor demos.
- **`sample_pr_diff.json`** is a canned diff the PR-review demo reads. **`mcp_memory_sample.json`** is a sample memory graph for the MCP memory demo.

Only edit a fixture when a demo script or Tim explicitly requests a change to that fixture. A drive-by "improvement" breaks the demo that depends on the file being broken.

## The secrets here are fake demo strings

Files like `legacy_payment_processor.py` contain strings shaped like live keys (`pk_live_...`, `sk_live_...`, `SECRET_KEY`, `JWT_SECRET`, the admin backdoor). They are **fabricated teaching props**, not real credentials.

- Never treat them as a live-secret incident: do not rotate, do not report, do not open a security finding against them.
- They will still trip secret scanners and pre-commit guards. That is expected; it is often the point of the security-review demo. Do not disable the scanner to "fix" the warning.
- Never copy these strings into published output (an Artifact, a gist, a slide, anything that leaves the repo). Fake or not, a `pk_live_` string in a shared page reads as a real leak.

## `memory.json` is live runtime state, not a fixture

`data/memory.json` is the default storage file the memory MCP server writes at runtime (`MCP_MEMORY_PATH` default in `segment_4_hero/memory_server/server.py`). It is **gitignored** (`.gitignore` line 159) and is the one file in this folder Claude should not hand-edit or commit.

- Let the memory server tools (`remember_decision`, `save_note`, and the rest) mutate it. Do not edit the JSON by hand.
- Do not `git add` it. If it shows up dirty, that is the server doing its job, not a change to stage.
- To reset the demo to an empty store, restore it to the empty-collections shape (`decisions`/`conventions`/`notes` as empty arrays, `context` as an empty object) rather than deleting the file.

## Related

- `segment_4_hero/memory_server/` - the FastMCP server that owns `memory.json`.
- The repo-root `CLAUDE.md` - project-wide conventions and the demo command list.
