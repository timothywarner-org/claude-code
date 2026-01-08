/**
 * Segment 2: Git Hooks Integration
 *
 * Shows how to integrate Claude into git hooks for automated
 * code review, commit message generation, and pre-push validation.
 *
 * Run: npx tsx segment_2_claude_code/04_git_hooks.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, chmodSync } from 'fs';
import { join } from 'path';
import { createClient, getModel } from '../src/utils/client.js';
import { logger } from '../src/utils/logger.js';

/**
 * Get staged changes for pre-commit hook
 */
function getStagedDiff(): string {
  try {
    return execSync('git diff --cached', { encoding: 'utf-8' });
  } catch {
    return '';
  }
}

/**
 * Get staged file names
 */
function getStagedFiles(): string[] {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Pre-commit hook: Quick code review
 */
async function preCommitReview(client: Anthropic, diff: string): Promise<boolean> {
  logger.subsection('Pre-commit Review');

  if (!diff.trim()) {
    logger.info('No staged changes to review', 'Hook');
    return true;
  }

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Quick review of this diff. Respond with JSON:
{
  "pass": true/false,
  "issues": ["issue1", "issue2"],
  "blocking": ["critical issue that should block commit"]
}

Only set pass=false if there are critical security issues or obvious bugs.

\`\`\`diff
${diff.substring(0, 10000)}
\`\`\``,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    logger.warn('Could not parse review response', 'Hook');
    return true;
  }

  const review = JSON.parse(jsonMatch[0]) as {
    pass: boolean;
    issues: string[];
    blocking: string[];
  };

  if (review.issues.length > 0) {
    logger.warn('Issues found:', 'Hook');
    review.issues.forEach((issue) => console.log(`  - ${issue}`));
  }

  if (review.blocking.length > 0) {
    logger.error('Blocking issues:', 'Hook');
    review.blocking.forEach((issue) => console.log(`  ❌ ${issue}`));
  }

  return review.pass;
}

/**
 * Prepare-commit-msg hook: Generate commit message
 */
async function generateCommitMessage(client: Anthropic, diff: string): Promise<string> {
  logger.subsection('Generating Commit Message');

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Generate a conventional commit message for this diff.
Use format: type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Keep the first line under 72 characters.
Add a body if the changes are significant.

\`\`\`diff
${diff.substring(0, 5000)}
\`\`\`

Respond with ONLY the commit message, no explanation.`,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text.trim() : '';
}

/**
 * Pre-push hook: Comprehensive review
 */
async function prePushReview(client: Anthropic, baseBranch = 'main'): Promise<boolean> {
  logger.subsection('Pre-push Review');

  let diff: string;
  try {
    diff = execSync(`git diff ${baseBranch}...HEAD`, { encoding: 'utf-8' });
  } catch {
    logger.info('No changes to review against base branch', 'Hook');
    return true;
  }

  if (!diff.trim()) {
    logger.info('No changes to review', 'Hook');
    return true;
  }

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Comprehensive review before push. Check for:
1. Security vulnerabilities
2. Breaking API changes
3. Missing tests for new functionality
4. Console.log or debug code left in
5. Hardcoded secrets or credentials

Respond with JSON:
{
  "approved": true/false,
  "summary": "brief summary",
  "concerns": ["concern1", "concern2"],
  "mustFix": ["critical issue"]
}

\`\`\`diff
${diff.substring(0, 15000)}
\`\`\``,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return true;
  }

  const review = JSON.parse(jsonMatch[0]) as {
    approved: boolean;
    summary: string;
    concerns: string[];
    mustFix: string[];
  };

  console.log(`\nSummary: ${review.summary}\n`);

  if (review.concerns.length > 0) {
    logger.warn('Concerns:', 'Hook');
    review.concerns.forEach((c) => console.log(`  ⚠️  ${c}`));
  }

  if (review.mustFix.length > 0) {
    logger.error('Must fix before push:', 'Hook');
    review.mustFix.forEach((c) => console.log(`  ❌ ${c}`));
  }

  return review.approved;
}

/**
 * Generate hook scripts
 */
function generateHookScripts(): void {
  logger.section('Generating Git Hook Scripts');

  const hooksDir = join(process.cwd(), '.git', 'hooks');

  if (!existsSync(hooksDir)) {
    logger.warn('.git/hooks directory not found', 'Setup');
    return;
  }

  // Pre-commit hook
  const preCommitScript = `#!/bin/sh
# Claude-powered pre-commit hook
# Performs quick code review on staged changes

echo "Running Claude pre-commit review..."
npx tsx segment_2_claude_code/04_git_hooks.ts pre-commit

if [ $? -ne 0 ]; then
  echo "Pre-commit review failed. Please address the issues."
  exit 1
fi
`;

  // Prepare-commit-msg hook
  const prepareCommitMsgScript = `#!/bin/sh
# Claude-powered commit message generator
# Generates conventional commit messages

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

# Only generate if no message provided
if [ -z "$COMMIT_SOURCE" ]; then
  echo "Generating commit message with Claude..."
  npx tsx segment_2_claude_code/04_git_hooks.ts prepare-commit-msg > "$COMMIT_MSG_FILE"
fi
`;

  // Pre-push hook
  const prePushScript = `#!/bin/sh
# Claude-powered pre-push hook
# Comprehensive review before pushing

echo "Running Claude pre-push review..."
npx tsx segment_2_claude_code/04_git_hooks.ts pre-push

if [ $? -ne 0 ]; then
  echo "Pre-push review failed. Please address the issues before pushing."
  exit 1
fi
`;

  // Write hooks
  const hooks = [
    { name: 'pre-commit', content: preCommitScript },
    { name: 'prepare-commit-msg', content: prepareCommitMsgScript },
    { name: 'pre-push', content: prePushScript },
  ];

  for (const hook of hooks) {
    const hookPath = join(hooksDir, hook.name);
    writeFileSync(hookPath, hook.content);
    chmodSync(hookPath, '755');
    logger.info(`Created ${hook.name} hook`, 'Setup');
  }

  logger.subsection('Hook Installation Complete');
  console.log(`
Hooks installed:
  - pre-commit: Quick review of staged changes
  - prepare-commit-msg: Auto-generate commit messages
  - pre-push: Comprehensive review before push

To disable temporarily:
  git commit --no-verify
  git push --no-verify
`);
}

/**
 * Main entry point - handles different hook modes
 */
async function main(): Promise<void> {
  const mode = process.argv[2] || 'demo';
  const client = createClient();

  switch (mode) {
    case 'pre-commit': {
      const diff = getStagedDiff();
      const passed = await preCommitReview(client, diff);
      process.exit(passed ? 0 : 1);
    }

    case 'prepare-commit-msg': {
      const diff = getStagedDiff();
      const message = await generateCommitMessage(client, diff);
      console.log(message);
      break;
    }

    case 'pre-push': {
      const passed = await prePushReview(client);
      process.exit(passed ? 0 : 1);
    }

    case 'install': {
      generateHookScripts();
      break;
    }

    case 'demo':
    default: {
      logger.section('Git Hooks Integration Demo');

      // Demo all hook types
      logger.info('Demonstrating git hook capabilities', 'Demo');

      const sampleDiff = `
diff --git a/src/api.ts b/src/api.ts
index abc123..def456 100644
--- a/src/api.ts
+++ b/src/api.ts
@@ -10,6 +10,15 @@ export async function getUsers() {
   return users;
 }

+export async function deleteUser(id: string) {
+  // Quick delete for testing
+  console.log('Deleting user:', id);
+  const query = \`DELETE FROM users WHERE id = '\${id}'\`;
+  await db.execute(query);
+  return { success: true };
+}
`;

      // Pre-commit review
      const preCommitPassed = await preCommitReview(client, sampleDiff);
      logger.info(`Pre-commit passed: ${preCommitPassed}`, 'Result');

      // Commit message generation
      const commitMsg = await generateCommitMessage(client, sampleDiff);
      logger.subsection('Generated Commit Message');
      console.log(commitMsg);

      // Show how to install hooks
      logger.subsection('To Install Hooks');
      console.log('Run: npx tsx segment_2_claude_code/04_git_hooks.ts install');

      logger.section('Demo Complete');
    }
  }
}

main().catch((error) => {
  logger.error(`Hook failed: ${error.message}`);
  process.exit(1);
});
