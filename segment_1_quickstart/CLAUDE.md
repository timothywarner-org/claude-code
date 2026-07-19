# Segment 1 - Zero (Claude Code Quick Start)

This directory teaches **install + first contact** with Claude Code. The lesson goal is to demonstrate that `CLAUDE.md` is the smallest, sharpest lever for giving a stateless model project state. This file itself becomes a teaching artifact in Segment 2.

## What lives here

- `01_installation.md` - the segment guide (5-block shape: cold open, mental model, demo, try-it-now, check understanding)
- `02_verify_setup.ts` - environment verification script
- `03_terminal_workflows.ts` - basic workflow demos

## Conventions for code in this segment

- **TypeScript only**, run via `npx tsx <file.ts>`. No build step. No `tsc`. No compiled output committed.
- **No class state.** Demos are top-level scripts or pure functions. We're teaching mental models, not OOP.
- **Keep examples under 60 lines.** If a demo grows past that, split it - learners need to read it on a projector.
- **Real model IDs in strings.** Use `claude-sonnet-5` literally, not a placeholder. Aliases (`sonnet`, `opus`) are fine in shell examples.
- **No `@anthropic-ai/sdk` calls.** This segment is CLI-only. SDK usage belongs to later segments.

## Voice

Plain-spoken senior engineer. Bold key terms. No em dashes. No "leverage." No "ask" as a noun.

## Cross-segment etiquette

If you're tempted to edit anything outside this directory, leave a `<!-- TODO: Agent E review -->` comment instead. Segments 2-4 are owned by other agents this sprint.
