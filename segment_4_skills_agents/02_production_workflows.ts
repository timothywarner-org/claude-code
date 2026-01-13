/**
 * Segment 4: Production Workflows
 *
 * Demonstrates production-ready workflows combining
 * Claude API, skills patterns, and CI/CD integration.
 *
 * Run: npx tsx segment_4_skills_agents/02_production_workflows.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import { createClient, getModel, formatCost, type ModelId } from '../src/utils/client.js';
import { logger } from '../src/utils/logger.js';

/**
 * Workflow 1: Automated Code Review
 */
async function codeReviewWorkflow(client: Anthropic): Promise<void> {
  logger.subsection('Code Review Workflow');

  // Simulate getting a diff
  const diff = `
diff --git a/src/auth.ts b/src/auth.ts
+export async function login(email: string, password: string) {
+  const query = \`SELECT * FROM users WHERE email = '\${email}'\`;
+  const user = await db.query(query);
+  if (user && user.password === password) {
+    console.log('User logged in:', email);
+    return { token: Math.random().toString() };
+  }
+  return null;
+}`;

  logger.info('Reviewing code changes...', 'Review');

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a code reviewer. Review this diff and return JSON:
{
  "approved": boolean,
  "issues": [{"severity": "critical|warning|info", "line": number, "message": string}],
  "summary": string
}

\`\`\`diff
${diff}
\`\`\``,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    const review = JSON.parse(jsonMatch[0]);
    console.log('\n📋 Review Result:');
    console.log(`   Status: ${review.approved ? '✅ Approved' : '❌ Changes Requested'}`);
    console.log(`   Issues: ${review.issues?.length || 0}`);
    console.log(`   Summary: ${review.summary || 'N/A'}`);

    if (review.issues?.length > 0) {
      console.log('\n   Issues found:');
      for (const issue of review.issues) {
        const icon = issue.severity === 'critical' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} Line ${issue.line}: ${issue.message}`);
      }
    }
  }
}

/**
 * Workflow 2: Documentation Generator
 */
async function documentationWorkflow(client: Anthropic): Promise<void> {
  logger.subsection('Documentation Generator');

  const code = `
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export async function createUser(email: string, name: string): Promise<User> {
  const user = await db.users.create({ email, name });
  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  return db.users.findById(id);
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User> {
  return db.users.update(id, updates);
}`;

  logger.info('Generating documentation...', 'Docs');

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Generate JSDoc documentation for this TypeScript code. Output only the documented code:

\`\`\`typescript
${code}
\`\`\``,
      },
    ],
  });

  const docs = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log('\n📚 Generated Documentation:');
  console.log(docs.substring(0, 800) + '...');
}

/**
 * Workflow 3: Commit Message Generator
 */
async function commitMessageWorkflow(client: Anthropic): Promise<void> {
  logger.subsection('Commit Message Generator');

  // Try to get real diff, fall back to sample
  let diff: string;
  try {
    diff = execSync('git diff --cached', { encoding: 'utf-8' });
    if (!diff.trim()) {
      diff = execSync('git diff HEAD~1', { encoding: 'utf-8' }).substring(0, 2000);
    }
  } catch {
    diff = `
diff --git a/src/api.ts b/src/api.ts
+import { rateLimit } from './middleware';
+
 export function createRouter() {
+  router.use(rateLimit({ max: 100, window: '1m' }));
   return router;
 }`;
  }

  logger.info('Generating commit message...', 'Git');

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Generate a conventional commit message for this diff.
Format: type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Keep under 72 characters. Output only the message.

\`\`\`diff
${diff.substring(0, 3000)}
\`\`\``,
      },
    ],
  });

  const message = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  console.log('\n📝 Suggested Commit Message:');
  console.log(`   ${message}`);
}

/**
 * Workflow 4: Release Notes Generator
 */
async function releaseNotesWorkflow(client: Anthropic): Promise<void> {
  logger.subsection('Release Notes Generator');

  const commits = `
feat(auth): Add JWT token refresh endpoint
fix(api): Handle null response in user lookup
docs: Update API documentation
feat(ui): Add dark mode toggle
fix(security): Patch SQL injection vulnerability
chore: Update dependencies`;

  logger.info('Generating release notes...', 'Release');

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Generate release notes from these commits. Group by type (Features, Fixes, etc.):

${commits}

Format as markdown. Be concise.`,
      },
    ],
  });

  const notes = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log('\n📋 Release Notes:');
  console.log(notes);
}

/**
 * Show CI/CD integration patterns
 */
function showCICDPatterns(): void {
  logger.subsection('CI/CD Integration Patterns');

  console.log(`
GITHUB ACTION EXAMPLE
─────────────────────

name: Claude Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Get PR diff
        run: |
          gh pr diff \${{ github.event.pull_request.number }} > diff.txt

      - name: Claude Review
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          claude -p "Review this diff for security issues" \\
            --allowedTools "Read" \\
            --output-format json > review.json

      - name: Post Review
        run: |
          # Parse review.json and post as PR comment
          node scripts/post-review.js


SCRIPTED USAGE
──────────────

# Print mode for automation
claude -p "Generate release notes from commits" > notes.md

# JSON output for parsing
claude -p "Review code" --output-format json > review.json

# Piped input
git diff | claude -p "Review this diff"
`);
}

/**
 * Show skill + agent combination
 */
function showSkillAgentCombo(): void {
  logger.subsection('Skills + Agents Combination');

  console.log(`
SKILL FILE: .claude/commands/full-deploy.md
───────────────────────────────────────────

# Full Deployment Workflow

Run a complete deployment preparation:

## Pre-checks
1. Ensure all tests pass: \`npm test\`
2. Check for uncommitted changes
3. Verify we're on the main branch

## Build
4. Run production build: \`npm run build\`
5. Check build output for errors

## Review
6. Get diff since last release
7. Identify breaking changes
8. Generate changelog entry

## Prepare
9. Update version in package.json
10. Create release notes
11. Output deploy command


USAGE
─────

$ claude --allowedTools "Read,Glob,Grep,Bash"
> /project:full-deploy

Claude will execute each step, stopping if any check fails.


PROGRAMMATIC SKILL INVOCATION
─────────────────────────────

import { execSync } from 'child_process';

const result = execSync(
  'claude -p "/project:full-deploy" --output-format json',
  { encoding: 'utf-8' }
);

const output = JSON.parse(result);
if (output.success) {
  console.log('Ready to deploy!');
  execSync(output.deployCommand);
}
`);
}

/**
 * Main demo
 */
async function main(): Promise<void> {
  logger.section('Production Workflows Demo');

  const client = createClient();

  // Run workflow demos
  await codeReviewWorkflow(client);
  await documentationWorkflow(client);
  await commitMessageWorkflow(client);
  await releaseNotesWorkflow(client);

  // Show patterns
  showCICDPatterns();
  showSkillAgentCombo();

  logger.section('Summary');
  console.log(`
Production workflow patterns:

1. CODE REVIEW
   Integrate Claude into PR reviews for security and quality checks.

2. DOCUMENTATION
   Auto-generate docs from code changes.

3. COMMIT MESSAGES
   Generate conventional commits from diffs.

4. RELEASE NOTES
   Create changelogs from commit history.

5. CI/CD
   Use print mode and JSON output for automation.

6. SKILLS + AGENTS
   Create reusable workflows with custom skills.

These patterns combine to create powerful, automated development workflows.
`);
}

main().catch((error) => {
  logger.error(`Workflow failed: ${error.message}`);
  process.exit(1);
});
