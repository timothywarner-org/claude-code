/**
 * Segment 3: Agent Boundaries
 *
 * Demonstrates how to configure agent permissions
 * and establish safe boundaries for autonomous operation.
 *
 * Run: npx tsx segment_3_agents/03_agent_boundaries.ts
 */

import { logger } from '../src/utils/logger.js';

/**
 * Show permission configuration
 */
function showPermissionConfig(): void {
  logger.section('Agent Permission Configuration');

  console.log(`
Claude Code uses a permission system to control what agents can do.


PERMISSION LEVELS
─────────────────

1. INTERACTIVE (Default)
   Claude asks for permission before each tool use.

   $ claude
   > "Edit the README.md file"

   Claude wants to use Edit on README.md. Allow? [y/n]


2. PRE-APPROVED TOOLS
   Specific tools run without prompts.

   $ claude --allowedTools "Read,Glob,Grep"

   Claude can read any file without asking.
   Still prompts for Edit, Write, Bash.


3. FULLY AUTONOMOUS
   No permission prompts (use carefully!)

   $ claude --dangerously-skip-permissions

   Claude executes all tools without asking.
   Only use for trusted, isolated tasks.
`);
}

/**
 * Show settings.json configuration
 */
function showSettingsConfig(): void {
  logger.section('Settings Configuration');

  const config = `
// .claude/settings.json - Project-level permissions
{
  "permissions": {
    // Tools that can run without prompting
    "allow": [
      "Read",
      "Glob",
      "Grep"
    ],

    // Tools that are completely blocked
    "deny": [
      "Bash"  // No shell commands
    ]
  },

  // Allowed tools for this project
  "allowedTools": [
    "Read",
    "Glob",
    "Grep",
    "Edit",
    "Write"
  ],

  // Custom instructions for the agent
  "customInstructions": "Always run tests after editing code."
}
`;

  logger.code(config, 'JSON');
}

/**
 * Show tool categories
 */
function showToolCategories(): void {
  logger.section('Tool Risk Categories');

  console.log(`
┌─────────────────────────────────────────────────────────────────────────┐
│  LOW RISK - Safe for autonomous use                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Read    │ Read file contents                                           │
│  Glob    │ Search for files by pattern                                  │
│  Grep    │ Search file contents                                         │
│  LS      │ List directory contents                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  MEDIUM RISK - Review changes before committing                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Edit    │ Modify existing files                                        │
│  Write   │ Create new files                                             │
│  Delete  │ Remove files (usually prompts)                               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  HIGH RISK - Require explicit approval                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Bash    │ Execute shell commands                                       │
│  MCP     │ Call external MCP tools                                      │
│  Network │ Make HTTP requests                                           │
└─────────────────────────────────────────────────────────────────────────┘
`);
}

/**
 * Show CLAUDE.md boundaries
 */
function showClaudeMdBoundaries(): void {
  logger.section('Setting Boundaries in CLAUDE.md');

  const claudeMd = `
# Agent Boundaries

## What You CAN Do

- Read any file in the repository
- Edit TypeScript and JavaScript files
- Create new files in src/ and tests/
- Run npm scripts via Bash

## What You CANNOT Do

- Modify files in node_modules/
- Edit .env or any files with secrets
- Run destructive git commands (reset, force push)
- Make changes without running tests first

## Before Making Changes

1. Create a new git branch
2. Run existing tests to establish baseline
3. Make changes incrementally
4. Run tests after each significant change

## If Something Goes Wrong

1. Stop immediately
2. Report what happened
3. Suggest how to fix it
4. Wait for human approval before proceeding
`;

  logger.code(claudeMd, 'Markdown');
}

/**
 * Show example workflows
 */
function showWorkflows(): void {
  logger.section('Safe Agent Workflows');

  console.log(`
WORKFLOW 1: READ-ONLY EXPLORATION
─────────────────────────────────
$ claude --allowedTools "Read,Glob,Grep"

> "Analyze the codebase architecture and create a diagram"

Safe because: Only reads files, cannot modify anything.


WORKFLOW 2: GUIDED EDITING
──────────────────────────
$ claude --allowedTools "Read,Glob,Grep,Edit"

> "Update all copyright headers to 2025"

Safe because: Can edit but not delete or run commands.
Review with: git diff


WORKFLOW 3: FULL AUTOMATION (Isolated)
──────────────────────────────────────
$ git checkout -b agent-refactor
$ claude --dangerously-skip-permissions

> "Refactor all callbacks to async/await"

Safe because: On a branch, easy to reset if needed.
Review with: git diff main


WORKFLOW 4: CI/CD INTEGRATION
─────────────────────────────
# In GitHub Actions
- name: Claude Code Review
  run: |
    claude -p "Review this PR for security issues" \\
      --allowedTools "Read,Glob,Grep" \\
      --output-format json > review.json

Safe because: Read-only in CI environment.
`);
}

/**
 * Show recovery procedures
 */
function showRecovery(): void {
  logger.section('Recovery Procedures');

  console.log(`
If an agent makes unwanted changes:

1. UNDO WITH GIT
   $ git checkout -- .              # Discard all changes
   $ git checkout -- path/to/file   # Discard specific file
   $ git stash                      # Save changes for later

2. REVIEW BEFORE COMMIT
   $ git diff                       # See all changes
   $ git diff --stat                # See changed files
   $ git add -p                     # Stage interactively

3. RESET IF COMMITTED
   $ git reset --soft HEAD~1        # Undo commit, keep changes
   $ git reset --hard HEAD~1        # Undo commit and changes

4. BRANCH PROTECTION
   - Always work on feature branches
   - Require PR reviews for main
   - Use branch protection rules
`);
}

/**
 * Main demo
 */
async function main(): Promise<void> {
  logger.section('Agent Boundaries Demo');

  showPermissionConfig();
  showSettingsConfig();
  showToolCategories();
  showClaudeMdBoundaries();
  showWorkflows();
  showRecovery();

  logger.section('Key Takeaways');
  console.log(`
1. Start with minimal permissions (Read, Glob, Grep)
2. Add write permissions when confident
3. Use branches for risky operations
4. Always review changes before committing
5. Document boundaries in CLAUDE.md

Continue to Segment 4 to learn about Skills!
`);
}

main().catch((error) => {
  logger.error(`Demo failed: ${error.message}`);
  process.exit(1);
});
