/**
 * Segment 4: Code Review Bot
 *
 * A production-ready code review bot that can be deployed
 * as a GitHub Action or standalone service.
 *
 * Run: npx tsx segment_4_production/03_code_review_bot.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient, getModel, formatCost, type ModelId } from '../src/utils/client.js';
import { logger } from '../src/utils/logger.js';

// Review configuration
interface ReviewConfig {
  maxDiffSize: number;
  checkSecurity: boolean;
  checkPerformance: boolean;
  checkStyle: boolean;
  checkTests: boolean;
  severityThreshold: 'info' | 'warning' | 'critical';
}

const DEFAULT_CONFIG: ReviewConfig = {
  maxDiffSize: 50000,
  checkSecurity: true,
  checkPerformance: true,
  checkStyle: true,
  checkTests: true,
  severityThreshold: 'warning',
};

// Review result types
interface ReviewComment {
  file: string;
  line: number;
  severity: 'info' | 'warning' | 'critical';
  category: 'security' | 'performance' | 'style' | 'bug' | 'test' | 'other';
  message: string;
  suggestion?: string;
}

interface ReviewResult {
  approved: boolean;
  summary: string;
  comments: ReviewComment[];
  stats: {
    filesReviewed: number;
    commentsGenerated: number;
    criticalIssues: number;
    warnings: number;
    suggestions: number;
    tokensUsed: number;
    cost: string;
  };
}

/**
 * Parse a git diff into file chunks
 */
function parseDiff(diff: string): Map<string, string> {
  const files = new Map<string, string>();
  const fileDiffs = diff.split(/^diff --git /m).filter(Boolean);

  for (const fileDiff of fileDiffs) {
    const match = fileDiff.match(/a\/(.+?) b\//);
    if (match) {
      files.set(match[1], fileDiff);
    }
  }

  return files;
}

/**
 * Review a single file's diff
 */
async function reviewFile(
  client: Anthropic,
  filename: string,
  diff: string,
  config: ReviewConfig
): Promise<{ comments: ReviewComment[]; tokens: number }> {
  const checks = [];
  if (config.checkSecurity) checks.push('security vulnerabilities');
  if (config.checkPerformance) checks.push('performance issues');
  if (config.checkStyle) checks.push('code style problems');
  if (config.checkTests) checks.push('missing tests');

  const systemPrompt = `You are an expert code reviewer. Review the provided diff and identify issues.

For each issue, provide:
- file: The filename
- line: The line number in the diff (use + line numbers for new code)
- severity: "info", "warning", or "critical"
- category: "security", "performance", "style", "bug", "test", or "other"
- message: Clear description of the issue
- suggestion: How to fix it (optional)

Focus on: ${checks.join(', ')}.

Only report real issues, not style preferences. Be specific and actionable.

Respond with a JSON array of issues:
[{ "file": "...", "line": 10, "severity": "warning", "category": "security", "message": "...", "suggestion": "..." }]

If no issues found, return an empty array: []`;

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Review this diff for ${filename}:\n\n\`\`\`diff\n${diff}\n\`\`\``,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
  const jsonMatch = text.match(/\[[\s\S]*\]/);

  let comments: ReviewComment[] = [];
  if (jsonMatch) {
    try {
      comments = JSON.parse(jsonMatch[0]) as ReviewComment[];
      // Ensure file is set correctly
      comments = comments.map((c) => ({ ...c, file: filename }));
    } catch {
      // Invalid JSON, return empty
    }
  }

  return {
    comments,
    tokens: response.usage.input_tokens + response.usage.output_tokens,
  };
}

/**
 * Generate review summary
 */
async function generateSummary(
  client: Anthropic,
  comments: ReviewComment[],
  filesReviewed: number
): Promise<{ summary: string; approved: boolean; tokens: number }> {
  const critical = comments.filter((c) => c.severity === 'critical');
  const warnings = comments.filter((c) => c.severity === 'warning');

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Generate a brief code review summary:

Files reviewed: ${filesReviewed}
Critical issues: ${critical.length}
Warnings: ${warnings.length}
Total comments: ${comments.length}

Key issues:
${comments
  .slice(0, 10)
  .map((c) => `- [${c.severity}] ${c.file}: ${c.message}`)
  .join('\n')}

Provide a 2-3 sentence summary. End with whether the PR should be approved or needs changes.`,
      },
    ],
  });

  const summary = response.content[0].type === 'text' ? response.content[0].text : '';
  const approved = critical.length === 0 && !summary.toLowerCase().includes('needs changes');

  return {
    summary,
    approved,
    tokens: response.usage.input_tokens + response.usage.output_tokens,
  };
}

/**
 * Main review function
 */
async function reviewPullRequest(
  client: Anthropic,
  diff: string,
  config: ReviewConfig = DEFAULT_CONFIG
): Promise<ReviewResult> {
  // Check diff size
  if (diff.length > config.maxDiffSize) {
    logger.warn(`Diff size (${diff.length}) exceeds limit (${config.maxDiffSize})`, 'Review');
    diff = diff.substring(0, config.maxDiffSize);
  }

  // Parse diff into files
  const files = parseDiff(diff);
  logger.info(`Reviewing ${files.size} files`, 'Review');

  // Review each file
  const allComments: ReviewComment[] = [];
  let totalTokens = 0;

  for (const [filename, fileDiff] of files) {
    logger.info(`Reviewing: ${filename}`, 'File');

    const { comments, tokens } = await reviewFile(client, filename, fileDiff, config);
    allComments.push(...comments);
    totalTokens += tokens;
  }

  // Filter by severity threshold
  const severityOrder = { info: 0, warning: 1, critical: 2 };
  const threshold = severityOrder[config.severityThreshold];
  const filteredComments = allComments.filter(
    (c) => severityOrder[c.severity] >= threshold
  );

  // Generate summary
  const { summary, approved, tokens: summaryTokens } = await generateSummary(
    client,
    filteredComments,
    files.size
  );
  totalTokens += summaryTokens;

  // Calculate stats
  const criticalIssues = filteredComments.filter((c) => c.severity === 'critical').length;
  const warnings = filteredComments.filter((c) => c.severity === 'warning').length;
  const suggestions = filteredComments.filter((c) => c.severity === 'info').length;

  return {
    approved,
    summary,
    comments: filteredComments,
    stats: {
      filesReviewed: files.size,
      commentsGenerated: filteredComments.length,
      criticalIssues,
      warnings,
      suggestions,
      tokensUsed: totalTokens,
      cost: formatCost(totalTokens * 0.7, totalTokens * 0.3, getModel() as ModelId),
    },
  };
}

/**
 * Format review result for GitHub
 */
function formatForGitHub(result: ReviewResult): string {
  let md = '## 🤖 Claude Code Review\n\n';

  // Status badge
  if (result.approved) {
    md += '✅ **Status: Approved**\n\n';
  } else {
    md += '❌ **Status: Changes Requested**\n\n';
  }

  // Summary
  md += `### Summary\n\n${result.summary}\n\n`;

  // Stats
  md += '### Stats\n\n';
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Files Reviewed | ${result.stats.filesReviewed} |\n`;
  md += `| Critical Issues | ${result.stats.criticalIssues} |\n`;
  md += `| Warnings | ${result.stats.warnings} |\n`;
  md += `| Suggestions | ${result.stats.suggestions} |\n`;
  md += '\n';

  // Comments by severity
  if (result.stats.criticalIssues > 0) {
    md += '### ❌ Critical Issues\n\n';
    for (const c of result.comments.filter((c) => c.severity === 'critical')) {
      md += `**${c.file}:${c.line}** - ${c.message}\n`;
      if (c.suggestion) {
        md += `> 💡 ${c.suggestion}\n`;
      }
      md += '\n';
    }
  }

  if (result.stats.warnings > 0) {
    md += '### ⚠️ Warnings\n\n';
    for (const c of result.comments.filter((c) => c.severity === 'warning')) {
      md += `**${c.file}:${c.line}** - ${c.message}\n`;
      if (c.suggestion) {
        md += `> 💡 ${c.suggestion}\n`;
      }
      md += '\n';
    }
  }

  if (result.stats.suggestions > 0) {
    md += '### ℹ️ Suggestions\n\n';
    for (const c of result.comments.filter((c) => c.severity === 'info')) {
      md += `- **${c.file}:${c.line}** - ${c.message}\n`;
    }
    md += '\n';
  }

  md += `\n---\n*Review cost: ${result.stats.cost}*`;

  return md;
}

/**
 * Demo with sample diff
 */
async function main(): Promise<void> {
  logger.section('Code Review Bot Demo');

  const client = createClient();

  // Sample diff for demo
  const sampleDiff = `
diff --git a/src/auth/login.ts b/src/auth/login.ts
index 1234567..abcdefg 100644
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -1,15 +1,35 @@
+import { hash, compare } from 'bcrypt';
+import jwt from 'jsonwebtoken';
+
 export async function loginUser(email: string, password: string) {
-  const user = await db.users.findOne({ email });
-  if (user && user.password === password) {
-    return { success: true, token: 'abc123' };
+  // Find user by email
+  const query = \`SELECT * FROM users WHERE email = '\${email}'\`;
+  const user = await db.query(query);
+
+  if (!user) {
+    return { success: false, error: 'User not found' };
+  }
+
+  // Check password
+  const isValid = await compare(password, user.passwordHash);
+  if (!isValid) {
+    return { success: false, error: 'Invalid password' };
   }
-  return { success: false };
+
+  // Generate token
+  const token = jwt.sign(
+    { userId: user.id, email: user.email },
+    process.env.JWT_SECRET,
+    { expiresIn: '24h' }
+  );
+
+  console.log('User logged in:', email, 'Token:', token);
+
+  return { success: true, token, user };
 }

diff --git a/src/api/users.ts b/src/api/users.ts
index 2345678..bcdefgh 100644
--- a/src/api/users.ts
+++ b/src/api/users.ts
@@ -10,6 +10,20 @@ export async function getUsers(page: number = 1) {
   return users;
 }

+export async function deleteUser(id: string) {
+  await db.users.delete({ id });
+  return { success: true };
+}
+
+export async function updateUser(id: string, data: any) {
+  const user = await db.users.findById(id);
+  Object.assign(user, data);
+  await user.save();
+  return user;
+}
`;

  // Run review
  logger.info('Starting code review...', 'Bot');

  const result = await reviewPullRequest(client, sampleDiff, {
    ...DEFAULT_CONFIG,
    severityThreshold: 'info',
  });

  // Format and display
  const markdown = formatForGitHub(result);

  logger.section('Review Result');
  console.log(markdown);

  // Show raw result
  logger.subsection('Raw Result (JSON)');
  logger.json(result.stats, 'Stats');
}

main().catch((error) => {
  logger.error(`Bot failed: ${error.message}`);
  process.exit(1);
});
