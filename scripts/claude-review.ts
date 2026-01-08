#!/usr/bin/env npx tsx
/**
 * Claude Code Review Script
 *
 * Automated code review using Claude API.
 * Used by GitHub Actions for PR reviews.
 *
 * Run: npx tsx scripts/claude-review.ts --diff pr_diff.txt --output review.md
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { parseArgs } from 'util';

interface ReviewComment {
  file: string;
  line: number;
  severity: 'info' | 'warning' | 'critical';
  category: string;
  message: string;
  suggestion?: string;
}

interface ReviewResult {
  approved: boolean;
  summary: string;
  comments: ReviewComment[];
}

// Parse command line arguments
const { values } = parseArgs({
  options: {
    diff: { type: 'string', short: 'd' },
    output: { type: 'string', short: 'o' },
    model: { type: 'string', short: 'm', default: 'claude-sonnet-4-20250514' },
  },
});

if (!values.diff) {
  console.error('Usage: claude-review.ts --diff <diff-file> --output <output-file>');
  process.exit(1);
}

const client = new Anthropic();

async function reviewDiff(diff: string): Promise<ReviewResult> {
  const systemPrompt = `You are an expert code reviewer. Analyze the provided git diff and identify:
1. Security vulnerabilities (SQL injection, XSS, hardcoded secrets, etc.)
2. Performance issues (N+1 queries, memory leaks, inefficient algorithms)
3. Bug risks (null pointer exceptions, race conditions, edge cases)
4. Code quality issues (maintainability, readability, best practices)

For each issue found, provide:
- file: The filename
- line: Line number (use + line numbers for added code)
- severity: "info", "warning", or "critical"
- category: "security", "performance", "bug", "quality"
- message: Clear description of the issue
- suggestion: How to fix it (optional)

Respond with JSON:
{
  "approved": true/false,
  "summary": "Brief overall assessment",
  "comments": [{ file, line, severity, category, message, suggestion }]
}

Only report genuine issues. Be specific and actionable. Approve if no critical issues found.`;

  const response = await client.messages.create({
    model: values.model || 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Review this diff:\n\n\`\`\`diff\n${diff}\n\`\`\``,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return {
      approved: true,
      summary: 'Unable to parse review response',
      comments: [],
    };
  }

  return JSON.parse(jsonMatch[0]) as ReviewResult;
}

function formatAsMarkdown(result: ReviewResult): string {
  let md = '';

  // Status
  if (result.approved) {
    md += '### ✅ Approved\n\n';
  } else {
    md += '### ❌ Changes Requested\n\n';
  }

  // Summary
  md += `**Summary:** ${result.summary}\n\n`;

  if (result.comments.length === 0) {
    md += 'No issues found. Great job! 🎉\n';
    return md;
  }

  // Group by severity
  const critical = result.comments.filter((c) => c.severity === 'critical');
  const warnings = result.comments.filter((c) => c.severity === 'warning');
  const info = result.comments.filter((c) => c.severity === 'info');

  if (critical.length > 0) {
    md += '### 🚨 Critical Issues\n\n';
    for (const c of critical) {
      md += `- **${c.file}:${c.line}** [${c.category}]\n`;
      md += `  ${c.message}\n`;
      if (c.suggestion) {
        md += `  > 💡 ${c.suggestion}\n`;
      }
      md += '\n';
    }
  }

  if (warnings.length > 0) {
    md += '### ⚠️ Warnings\n\n';
    for (const c of warnings) {
      md += `- **${c.file}:${c.line}** [${c.category}]\n`;
      md += `  ${c.message}\n`;
      if (c.suggestion) {
        md += `  > 💡 ${c.suggestion}\n`;
      }
      md += '\n';
    }
  }

  if (info.length > 0) {
    md += '### ℹ️ Suggestions\n\n';
    for (const c of info) {
      md += `- **${c.file}:${c.line}** - ${c.message}\n`;
    }
    md += '\n';
  }

  // Stats
  md += '---\n\n';
  md += `📊 **Stats:** ${critical.length} critical, ${warnings.length} warnings, ${info.length} suggestions\n`;

  return md;
}

async function main(): Promise<void> {
  console.log('🔍 Running Claude code review...\n');

  // Read diff file
  const diff = readFileSync(values.diff!, 'utf-8');

  if (diff.trim().length === 0) {
    console.log('No changes to review.');
    if (values.output) {
      writeFileSync(values.output, '### ✅ No Changes\n\nNo code changes detected in this PR.\n');
    }
    return;
  }

  console.log(`Reviewing ${diff.split('\n').length} lines of diff...`);

  // Run review
  const result = await reviewDiff(diff);

  // Format output
  const markdown = formatAsMarkdown(result);

  // Write to file or stdout
  if (values.output) {
    writeFileSync(values.output, markdown);
    console.log(`\n✅ Review written to ${values.output}`);
  } else {
    console.log('\n' + markdown);
  }

  // Exit with error if not approved (for CI/CD)
  if (!result.approved) {
    console.log('\n❌ Review found critical issues');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Review failed:', error.message);
  process.exit(1);
});
