/**
 * Segment 2: Code Review Workflow Demo
 *
 * Demonstrates how to use Claude's API for automated code review.
 * This pattern can be integrated into CI/CD pipelines.
 *
 * Run: npx tsx segment_2_claude_code/02_code_review_workflow.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import { createClient, getModel } from '../src/utils/client.js';
import { logger } from '../src/utils/logger.js';

interface ReviewResult {
  summary: string;
  issues: ReviewIssue[];
  suggestions: string[];
  approved: boolean;
}

interface ReviewIssue {
  severity: 'critical' | 'warning' | 'info';
  file: string;
  line?: number;
  message: string;
}

/**
 * Get git diff for review
 */
function getGitDiff(base = 'main'): string {
  try {
    // Get diff against base branch
    const diff = execSync(`git diff ${base}...HEAD`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
    });

    if (!diff.trim()) {
      // If no diff against base, get staged changes
      return execSync('git diff --cached', { encoding: 'utf-8' });
    }

    return diff;
  } catch {
    logger.warn('Could not get git diff, using sample diff', 'Git');
    return SAMPLE_DIFF;
  }
}

/**
 * Get list of changed files
 */
function getChangedFiles(base = 'main'): string[] {
  try {
    const output = execSync(`git diff --name-only ${base}...HEAD`, {
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return ['sample.ts'];
  }
}

/**
 * Review code using Claude
 */
async function reviewCode(client: Anthropic, diff: string): Promise<ReviewResult> {
  const systemPrompt = `You are an expert code reviewer. Analyze the provided git diff and provide a structured review.

Your review should:
1. Identify security vulnerabilities (critical)
2. Find bugs and logic errors (critical/warning)
3. Point out performance issues (warning)
4. Suggest code style improvements (info)
5. Note missing tests or documentation (info)

Respond with a JSON object matching this structure:
{
  "summary": "Brief overall assessment",
  "issues": [
    {
      "severity": "critical|warning|info",
      "file": "path/to/file.ts",
      "line": 42,
      "message": "Description of the issue"
    }
  ],
  "suggestions": ["Improvement suggestion 1", "Suggestion 2"],
  "approved": true/false
}

Set approved to false if there are any critical issues.`;

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Please review this git diff:\n\n\`\`\`diff\n${diff}\n\`\`\``,
      },
    ],
  });

  // Extract JSON from response
  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse JSON (handle markdown code blocks)
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('Could not parse review response');
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  return JSON.parse(jsonStr) as ReviewResult;
}

/**
 * Format review result for display
 */
function formatReview(review: ReviewResult, changedFiles: string[]): void {
  logger.section('Code Review Results');

  // Summary
  logger.subsection('Summary');
  console.log(review.summary);
  console.log('');

  // Changed files
  logger.subsection(`Changed Files (${changedFiles.length})`);
  for (const file of changedFiles) {
    console.log(`  - ${file}`);
  }
  console.log('');

  // Issues by severity
  const critical = review.issues.filter((i) => i.severity === 'critical');
  const warnings = review.issues.filter((i) => i.severity === 'warning');
  const info = review.issues.filter((i) => i.severity === 'info');

  if (critical.length > 0) {
    logger.subsection(`Critical Issues (${critical.length})`);
    for (const issue of critical) {
      const location = issue.line ? `${issue.file}:${issue.line}` : issue.file;
      console.log(`  ❌ [${location}] ${issue.message}`);
    }
    console.log('');
  }

  if (warnings.length > 0) {
    logger.subsection(`Warnings (${warnings.length})`);
    for (const issue of warnings) {
      const location = issue.line ? `${issue.file}:${issue.line}` : issue.file;
      console.log(`  ⚠️  [${location}] ${issue.message}`);
    }
    console.log('');
  }

  if (info.length > 0) {
    logger.subsection(`Suggestions (${info.length})`);
    for (const issue of info) {
      const location = issue.line ? `${issue.file}:${issue.line}` : issue.file;
      console.log(`  ℹ️  [${location}] ${issue.message}`);
    }
    console.log('');
  }

  // Improvement suggestions
  if (review.suggestions.length > 0) {
    logger.subsection('Recommendations');
    for (const suggestion of review.suggestions) {
      console.log(`  • ${suggestion}`);
    }
    console.log('');
  }

  // Approval status
  logger.subsection('Status');
  if (review.approved) {
    console.log('  ✅ APPROVED - No critical issues found');
  } else {
    console.log('  ❌ CHANGES REQUESTED - Please address critical issues');
  }
}

/**
 * Sample diff for demo purposes
 */
const SAMPLE_DIFF = `
diff --git a/src/api/users.ts b/src/api/users.ts
index 1234567..abcdefg 100644
--- a/src/api/users.ts
+++ b/src/api/users.ts
@@ -15,6 +15,20 @@ export async function getUser(id: string): Promise<User> {
   return user;
 }

+export async function deleteUser(id: string): Promise<void> {
+  // TODO: Add authentication check
+  const query = \`DELETE FROM users WHERE id = '\${id}'\`;
+  await db.execute(query);
+}
+
+export async function updateUserEmail(id: string, email: string): Promise<User> {
+  const user = await db.users.findById(id);
+  user.email = email;
+  await user.save();
+  return user;
+}
+
 export async function listUsers(page: number = 1): Promise<User[]> {
-  const users = await db.users.find().skip((page - 1) * 10).limit(10);
+  const users = await db.users.find().skip((page - 1) * 100).limit(100);
   return users;
 }
`;

/**
 * Main demo runner
 */
async function main(): Promise<void> {
  logger.section('Claude Code Review Workflow');

  const client = createClient();

  // Get diff
  logger.info('Getting git diff...', 'Setup');
  const diff = getGitDiff();
  const changedFiles = getChangedFiles();

  logger.info(`Found ${changedFiles.length} changed files`, 'Setup');
  logger.info(`Diff size: ${diff.length} characters`, 'Setup');

  // Review code
  logger.subsection('Analyzing code with Claude...');
  const review = await reviewCode(client, diff);

  // Display results
  formatReview(review, changedFiles);

  // Exit code based on approval
  if (!review.approved) {
    logger.info('Exiting with code 1 (changes requested)', 'Exit');
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error(`Review failed: ${error.message}`);
  process.exit(1);
});
