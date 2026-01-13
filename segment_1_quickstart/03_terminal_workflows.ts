/**
 * Segment 1: Terminal Workflows Demo
 *
 * Shows common terminal workflows with Claude Code.
 * Demonstrates streaming, code review, and refactoring patterns.
 *
 * Run: npx tsx segment_1_quickstart/03_terminal_workflows.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient, getModel } from '../src/utils/client.js';
import { logger } from '../src/utils/logger.js';

/**
 * Demo 1: Streaming responses for real-time feedback
 */
async function streamingDemo(client: Anthropic): Promise<void> {
  logger.subsection('Streaming Responses');
  logger.info('Streaming is essential for responsive terminal workflows', 'Demo');

  console.log('\nClaude says:\n');

  const stream = client.messages.stream({
    model: getModel(),
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: 'Explain streaming API responses in 3 bullet points. Be concise.',
      },
    ],
  });

  stream.on('text', (text) => {
    process.stdout.write(text);
  });

  await stream.finalMessage();
  console.log('\n');
}

/**
 * Demo 2: Code review workflow
 */
async function codeReviewDemo(client: Anthropic): Promise<void> {
  logger.subsection('Code Review Workflow');

  const codeToReview = `
function login(email, password) {
  const query = "SELECT * FROM users WHERE email = '" + email + "'";
  const user = db.query(query);
  if (user && user.password === password) {
    return { token: Math.random().toString() };
  }
  return null;
}`;

  logger.info('Reviewing sample code for issues...', 'Demo');

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `Review this code for security issues. Be direct and specific:

\`\`\`javascript
${codeToReview}
\`\`\``,
      },
    ],
  });

  const review = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log('\n' + review + '\n');
}

/**
 * Demo 3: Quick refactoring
 */
async function refactoringDemo(client: Anthropic): Promise<void> {
  logger.subsection('Quick Refactoring');

  const legacyCode = `
var users = [];
function addUser(name, email) {
  var user = { name: name, email: email, id: users.length + 1 };
  users.push(user);
  return user;
}
function getUser(id) {
  for (var i = 0; i < users.length; i++) {
    if (users[i].id == id) return users[i];
  }
  return null;
}`;

  logger.info('Converting legacy JavaScript to modern TypeScript...', 'Demo');

  console.log('\nOriginal code:');
  logger.code(legacyCode.trim(), 'JavaScript');

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `Convert this to modern TypeScript with proper types. Only output the code, no explanation:

\`\`\`javascript
${legacyCode}
\`\`\``,
      },
    ],
  });

  const refactored = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log('Refactored:');
  console.log(refactored);
}

/**
 * Demo 4: Generate commit message
 */
async function commitMessageDemo(client: Anthropic): Promise<void> {
  logger.subsection('Generate Commit Message');

  const diff = `
diff --git a/src/auth.ts b/src/auth.ts
+import { hash, compare } from 'bcrypt';
+
 export async function login(email: string, password: string) {
-  const user = await db.users.findOne({ email });
-  if (user && user.password === password) {
+  const user = await db.users.findOne({ email });
+  if (user && await compare(password, user.passwordHash)) {
     return { token: generateToken(user.id) };
   }
   return null;
 }`;

  logger.info('Generating commit message from diff...', 'Demo');

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: `Generate a conventional commit message for this diff. Format: type(scope): description

\`\`\`diff
${diff}
\`\`\`

Output only the commit message.`,
      },
    ],
  });

  const message = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log('\nSuggested commit message:');
  console.log(`  ${message.trim()}\n`);
}

/**
 * Main demo runner
 */
async function main(): Promise<void> {
  logger.section('Terminal Workflows Demo');

  const client = createClient();

  await streamingDemo(client);
  await codeReviewDemo(client);
  await refactoringDemo(client);
  await commitMessageDemo(client);

  logger.section('Workflow Summary');
  console.log(`
These patterns work great in Claude Code's interactive mode:

  claude "Review my changes for security issues"
  claude "Refactor this class to use async/await"
  claude "Generate a commit message for my staged changes"

The key is Claude's ability to understand your full codebase context.

Continue to Segment 2 to add persistent memory with MCP servers.
`);
}

main().catch((error) => {
  logger.error(`Demo failed: ${error.message}`);
  process.exit(1);
});
