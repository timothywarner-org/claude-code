# Agent Boundaries — Segment 3 Working Directory

> This file is the lesson. Claude reads it on **every turn** when working under `segment_3_agents/`. Edit the markdown, change the autonomous behavior. No restart required.

## What you CAN do

- Read any file in `segment_3_agents/` or its siblings.
- Edit the demo TypeScript files (`02_agent_loop.ts`, `03_agent_boundaries.ts`).
- Create new example files under `segment_3_agents/examples/` if the user requests one.
- Run `npx tsx segment_3_agents/<file>.ts` to validate a demo compiles.

## What you CANNOT do

- Modify `tsconfig.json`, `package.json`, or `package-lock.json`. Other segments depend on the toolchain staying still.
- Edit `.env`, `.env.example`, or any file containing secrets.
- Touch files outside `segment_3_agents/` without an explicit instruction naming the target file.
- Run destructive git commands: `reset --hard`, `push --force`, `branch -D`, `clean -fd`.
- Delete files. If something looks wrong, rename it with a `.bak` suffix and report it.

## Before making changes

1. Confirm you are on a feature branch, not `main`. If on `main`, stop and report.
2. State the change you are about to make in one sentence, then make it.
3. After any edit, run `npx tsx <edited-file>` to confirm it still parses.

## If something goes wrong

1. Stop immediately. Do not attempt to "fix" by making more changes.
2. Report exactly what failed, including the command and the error.
3. Suggest the smallest reversible step (usually `git diff` then `git checkout -- <file>`).
4. Wait for human approval before the next action.
