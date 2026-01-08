#!/usr/bin/env npx tsx
/**
 * Generate Release Notes Script
 *
 * Uses Claude to generate comprehensive release notes from git history.
 * Used by GitHub Actions for automated releases.
 *
 * Run: npx tsx scripts/generate-release-notes.ts --from v1.0.0 --to v2.0.0 --output release_notes.md
 */

import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { parseArgs } from 'util';

// Parse command line arguments
const { values } = parseArgs({
  options: {
    from: { type: 'string', short: 'f' },
    to: { type: 'string', short: 't' },
    output: { type: 'string', short: 'o' },
    model: { type: 'string', short: 'm', default: 'claude-sonnet-4-20250514' },
  },
});

if (!values.to) {
  console.error('Usage: generate-release-notes.ts --from <tag> --to <tag> --output <file>');
  console.error('  --from is optional (defaults to previous tag)');
  process.exit(1);
}

const client = new Anthropic();

function getGitLog(from: string | undefined, to: string): string {
  const range = from ? `${from}..${to}` : to;
  try {
    return execSync(`git log ${range} --pretty=format:"%h %s (%an)" --no-merges`, {
      encoding: 'utf-8',
    });
  } catch {
    return execSync(`git log ${to} --pretty=format:"%h %s (%an)" --no-merges -50`, {
      encoding: 'utf-8',
    });
  }
}

function getGitDiff(from: string | undefined, to: string): string {
  const range = from ? `${from}..${to}` : `${to}~10..${to}`;
  try {
    const diff = execSync(`git diff ${range} --stat`, { encoding: 'utf-8' });
    return diff.substring(0, 5000); // Limit size
  } catch {
    return '';
  }
}

function getContributors(from: string | undefined, to: string): string[] {
  const range = from ? `${from}..${to}` : to;
  try {
    const authors = execSync(`git log ${range} --pretty=format:"%an" | sort | uniq`, {
      encoding: 'utf-8',
    });
    return authors.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

async function generateReleaseNotes(
  version: string,
  commits: string,
  diff: string,
  contributors: string[]
): Promise<string> {
  const response = await client.messages.create({
    model: values.model || 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Generate professional release notes for version ${version}.

## Commits
${commits}

## File Changes Summary
${diff}

## Contributors
${contributors.join(', ')}

Create release notes with this format:

# Release ${version}

## Highlights
(2-3 sentence summary of the most important changes)

## What's New
- Feature descriptions

## Improvements
- Enhancements to existing features

## Bug Fixes
- Fixed issues

## Breaking Changes
(if any)

## Contributors
Thank contributors

---

Be concise but informative. Group related changes. Use emojis sparingly (🚀 for features, 🐛 for bugs, ⚡ for performance).`,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

async function main(): Promise<void> {
  console.log('📝 Generating release notes...\n');

  const version = values.to!;
  const fromTag = values.from;

  console.log(`Version: ${version}`);
  if (fromTag) {
    console.log(`From: ${fromTag}`);
  }

  // Get git information
  console.log('\nFetching git history...');
  const commits = getGitLog(fromTag, version);
  const diff = getGitDiff(fromTag, version);
  const contributors = getContributors(fromTag, version);

  console.log(`Found ${commits.split('\n').filter(Boolean).length} commits`);
  console.log(`Contributors: ${contributors.length}`);

  // Generate release notes
  console.log('\nGenerating release notes with Claude...');
  const notes = await generateReleaseNotes(version, commits, diff, contributors);

  // Output
  if (values.output) {
    writeFileSync(values.output, notes);
    console.log(`\n✅ Release notes written to ${values.output}`);
  } else {
    console.log('\n' + '='.repeat(60) + '\n');
    console.log(notes);
  }
}

main().catch((error) => {
  console.error('Failed to generate release notes:', error.message);
  process.exit(1);
});
