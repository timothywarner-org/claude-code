#!/usr/bin/env npx tsx
/**
 * Documentation Check Script
 *
 * Checks if code changes require documentation updates.
 * Used by GitHub Actions to ensure docs stay in sync.
 *
 * Run: npx tsx scripts/check-docs.ts --base origin/main --head HEAD
 */

import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { parseArgs } from 'util';

interface DocCheck {
  file: string;
  needsUpdate: boolean;
  reason: string;
  suggestedDocs: string[];
}

// Parse command line arguments
const { values } = parseArgs({
  options: {
    base: { type: 'string', short: 'b', default: 'origin/main' },
    head: { type: 'string', short: 'h', default: 'HEAD' },
    model: { type: 'string', short: 'm', default: 'claude-sonnet-4-20250514' },
  },
});

const client = new Anthropic();

function getChangedFiles(): string[] {
  const output = execSync(`git diff --name-only ${values.base}...${values.head}`, {
    encoding: 'utf-8',
  });
  return output.split('\n').filter(Boolean);
}

function getFileDiff(file: string): string {
  try {
    return execSync(`git diff ${values.base}...${values.head} -- ${file}`, {
      encoding: 'utf-8',
    });
  } catch {
    return '';
  }
}

function findRelatedDocs(file: string): string[] {
  const docs: string[] = [];
  const baseName = file.replace(/\.[^.]+$/, '');

  // Check for README in same directory
  const dirReadme = file.replace(/[^/]+$/, 'README.md');
  if (existsSync(dirReadme)) docs.push(dirReadme);

  // Check for specific doc file
  const docFile = `docs/${baseName}.md`;
  if (existsSync(docFile)) docs.push(docFile);

  // Check root README
  if (existsSync('README.md')) docs.push('README.md');

  // Check API docs
  if (existsSync('docs/API.md')) docs.push('docs/API.md');

  return [...new Set(docs)];
}

async function checkDocumentation(
  file: string,
  diff: string,
  relatedDocs: string[]
): Promise<DocCheck> {
  // Skip non-source files
  if (
    !file.match(/\.(ts|js|tsx|jsx|py|go|java|rb)$/) ||
    file.includes('.test.') ||
    file.includes('.spec.')
  ) {
    return {
      file,
      needsUpdate: false,
      reason: 'Non-source or test file',
      suggestedDocs: [],
    };
  }

  const docContents = relatedDocs
    .map((d) => {
      try {
        return `## ${d}\n${readFileSync(d, 'utf-8').substring(0, 2000)}`;
      } catch {
        return '';
      }
    })
    .filter(Boolean)
    .join('\n\n');

  const response = await client.messages.create({
    model: values.model || 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Analyze if this code change requires documentation updates.

## Changed File: ${file}

### Diff:
\`\`\`diff
${diff.substring(0, 5000)}
\`\`\`

### Related Documentation:
${docContents || 'No related docs found'}

Respond with JSON:
{
  "needsUpdate": true/false,
  "reason": "Why docs need/don't need update",
  "suggestedDocs": ["list", "of", "docs", "to", "update"]
}

Consider:
- API changes (new params, return types, breaking changes)
- New exported functions/classes
- Changed behavior that users need to know about
- Configuration changes
- New features or removed functionality`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return {
      file,
      needsUpdate: false,
      reason: 'Could not analyze',
      suggestedDocs: [],
    };
  }

  const result = JSON.parse(jsonMatch[0]) as {
    needsUpdate: boolean;
    reason: string;
    suggestedDocs: string[];
  };

  return {
    file,
    ...result,
  };
}

async function main(): Promise<void> {
  console.log('📚 Checking documentation...\n');
  console.log(`Comparing ${values.base} to ${values.head}\n`);

  const changedFiles = getChangedFiles();
  console.log(`Found ${changedFiles.length} changed files\n`);

  const needsUpdate: DocCheck[] = [];
  const checked: DocCheck[] = [];

  for (const file of changedFiles) {
    process.stdout.write(`Checking: ${file}...`);

    const diff = getFileDiff(file);
    if (!diff) {
      console.log(' (no diff)');
      continue;
    }

    const relatedDocs = findRelatedDocs(file);
    const check = await checkDocumentation(file, diff, relatedDocs);
    checked.push(check);

    if (check.needsUpdate) {
      needsUpdate.push(check);
      console.log(' ⚠️  needs update');
    } else {
      console.log(' ✓');
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Documentation Check Summary');
  console.log('='.repeat(60) + '\n');

  if (needsUpdate.length === 0) {
    console.log('✅ No documentation updates required!\n');
    process.exit(0);
  }

  console.log(`⚠️  ${needsUpdate.length} file(s) may need documentation updates:\n`);

  for (const check of needsUpdate) {
    console.log(`📝 ${check.file}`);
    console.log(`   Reason: ${check.reason}`);
    if (check.suggestedDocs.length > 0) {
      console.log(`   Update: ${check.suggestedDocs.join(', ')}`);
    }
    console.log('');
  }

  // Create summary for CI
  console.log('─'.repeat(60));
  console.log('\nConsider updating the following documentation:');
  const allSuggested = [
    ...new Set(needsUpdate.flatMap((c) => c.suggestedDocs)),
  ];
  for (const doc of allSuggested) {
    console.log(`  - ${doc}`);
  }

  // Exit with warning (not error) - docs are recommended but not required
  process.exit(0);
}

main().catch((error) => {
  console.error('Documentation check failed:', error.message);
  process.exit(1);
});
