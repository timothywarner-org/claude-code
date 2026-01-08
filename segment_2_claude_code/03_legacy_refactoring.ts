/**
 * Segment 2: Legacy Code Refactoring Demo
 *
 * Demonstrates how Claude can help refactor legacy code
 * by understanding the full context of the codebase.
 *
 * Run: npx tsx segment_2_claude_code/03_legacy_refactoring.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient, getModel } from '../src/utils/client.js';
import { logger } from '../src/utils/logger.js';

/**
 * Sample legacy code to refactor
 */
const LEGACY_CODE = `
// legacy-api.js - Written in 2015, needs modernization
var express = require('express');
var app = express();
var mysql = require('mysql');

var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password123',
  database: 'myapp'
});

// Get all users
app.get('/users', function(req, res) {
  var page = req.query.page || 1;
  var query = "SELECT * FROM users LIMIT " + ((page - 1) * 10) + ", 10";

  connection.query(query, function(err, results) {
    if (err) {
      console.log(err);
      res.status(500).send('Error');
      return;
    }
    res.json(results);
  });
});

// Get user by ID
app.get('/users/:id', function(req, res) {
  var query = "SELECT * FROM users WHERE id = " + req.params.id;

  connection.query(query, function(err, results) {
    if (err) {
      console.log(err);
      res.status(500).send('Error');
      return;
    }
    if (results.length == 0) {
      res.status(404).send('Not found');
      return;
    }
    res.json(results[0]);
  });
});

// Create user
app.post('/users', function(req, res) {
  var name = req.body.name;
  var email = req.body.email;
  var query = "INSERT INTO users (name, email) VALUES ('" + name + "', '" + email + "')";

  connection.query(query, function(err, results) {
    if (err) {
      console.log(err);
      res.status(500).send('Error');
      return;
    }
    res.json({ id: results.insertId, name: name, email: email });
  });
});

// Delete user
app.delete('/users/:id', function(req, res) {
  var query = "DELETE FROM users WHERE id = " + req.params.id;

  connection.query(query, function(err, results) {
    if (err) {
      console.log(err);
      res.status(500).send('Error');
      return;
    }
    res.json({ success: true });
  });
});

app.listen(3000, function() {
  console.log('Server running on port 3000');
});
`;

/**
 * Analyze legacy code for issues
 */
async function analyzeCode(client: Anthropic, code: string): Promise<string> {
  logger.subsection('Analyzing Legacy Code');

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Analyze this legacy JavaScript code and identify all issues that need to be addressed:

\`\`\`javascript
${code}
\`\`\`

List issues in these categories:
1. Security vulnerabilities
2. Code quality issues
3. Performance concerns
4. Maintainability problems
5. Missing best practices

Be specific and reference line numbers where applicable.`,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

/**
 * Generate refactored code
 */
async function refactorCode(client: Anthropic, code: string, analysis: string): Promise<string> {
  logger.subsection('Generating Refactored Code');

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Based on this analysis of legacy code:

${analysis}

Please refactor the following code to modern TypeScript, addressing all identified issues:

\`\`\`javascript
${code}
\`\`\`

Requirements:
1. Convert to TypeScript with proper types
2. Use async/await instead of callbacks
3. Use parameterized queries to prevent SQL injection
4. Add proper error handling with custom error classes
5. Use environment variables for configuration
6. Add input validation with Zod
7. Structure code with separation of concerns
8. Add JSDoc comments

Provide the complete refactored code.`,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

/**
 * Generate tests for refactored code
 */
async function generateTests(client: Anthropic, refactoredCode: string): Promise<string> {
  logger.subsection('Generating Tests');

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Generate comprehensive tests for this TypeScript API code using Vitest:

${refactoredCode}

Include:
1. Unit tests for each endpoint
2. Tests for error cases
3. Tests for input validation
4. Mock database calls

Use modern testing patterns and provide the complete test file.`,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

/**
 * Generate migration guide
 */
async function generateMigrationGuide(
  client: Anthropic,
  originalCode: string,
  refactoredCode: string
): Promise<string> {
  logger.subsection('Generating Migration Guide');

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Create a migration guide for transitioning from this legacy code:

\`\`\`javascript
${originalCode}
\`\`\`

To this refactored version:

${refactoredCode}

Include:
1. Step-by-step migration instructions
2. Required dependency changes
3. Environment variable setup
4. Database migration considerations
5. Testing strategy
6. Rollback plan`,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

/**
 * Main demo runner
 */
async function main(): Promise<void> {
  logger.section('Legacy Code Refactoring Demo');

  const client = createClient();

  // Show original code
  logger.subsection('Original Legacy Code');
  logger.code(LEGACY_CODE.trim(), 'JavaScript');

  // Analyze code
  const analysis = await analyzeCode(client, LEGACY_CODE);
  logger.subsection('Analysis Results');
  console.log(analysis);

  // Refactor code
  const refactored = await refactorCode(client, LEGACY_CODE, analysis);
  logger.subsection('Refactored Code');
  console.log(refactored);

  // Generate tests
  const tests = await generateTests(client, refactored);
  logger.subsection('Generated Tests');
  console.log(tests);

  // Generate migration guide
  const guide = await generateMigrationGuide(client, LEGACY_CODE, refactored);
  logger.subsection('Migration Guide');
  console.log(guide);

  logger.section('Demo Complete');
  logger.info(
    'Claude can analyze, refactor, test, and document legacy code in one session!',
    'Summary'
  );
}

main().catch((error) => {
  logger.error(`Demo failed: ${error.message}`);
  process.exit(1);
});
