/**
 * Segment 1: Verify Setup
 *
 * Quick verification that Claude Code and API access are working.
 * Run this first to confirm your environment is configured correctly.
 *
 * Run: npx tsx segment_1_quickstart/02_verify_setup.ts
 */

import { createClient, getModel, validateApiKey, formatCost } from '../src/utils/client.js';
import { logger } from '../src/utils/logger.js';

async function main(): Promise<void> {
  logger.section('Claude Code Setup Verification');

  // Check environment
  logger.subsection('Environment Check');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.error('ANTHROPIC_API_KEY not set');
    logger.info('Set it with: export ANTHROPIC_API_KEY=sk-ant-api03-...');
    process.exit(1);
  }

  logger.success('ANTHROPIC_API_KEY is set');
  logger.info(`Key prefix: ${apiKey.substring(0, 15)}...`, 'API');

  // Check model configuration
  const model = getModel();
  logger.info(`Using model: ${model}`, 'Model');

  // Test API connection
  logger.subsection('API Connection Test');

  const client = createClient();
  logger.info('Testing API connection...');

  const isValid = await validateApiKey(client);
  if (!isValid) {
    logger.error('API key validation failed');
    logger.info('Check that your API key is correct and has available credits');
    process.exit(1);
  }

  logger.success('API connection successful!');

  // Run a simple test
  logger.subsection('Quick Test');

  const startTime = Date.now();
  const response = await client.messages.create({
    model,
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: 'Say "Hello from Claude Code!" and nothing else.',
      },
    ],
  });

  const duration = Date.now() - startTime;
  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  console.log(`\n${text}\n`);

  logger.info(`Response time: ${duration}ms`, 'Stats');
  logger.info(`Input tokens: ${response.usage.input_tokens}`, 'Stats');
  logger.info(`Output tokens: ${response.usage.output_tokens}`, 'Stats');
  logger.info(
    `Estimated cost: ${formatCost(response.usage.input_tokens, response.usage.output_tokens, model)}`,
    'Stats'
  );

  // Summary
  logger.section('Setup Complete!');

  console.log(`
Your Claude Code environment is ready.

Next steps:
  1. Run: claude (to start interactive mode)
  2. Try: claude "Explain what this project does"
  3. Create a CLAUDE.md file for project context

Continue to Segment 2 to learn about MCP servers.
`);
}

main().catch((error) => {
  logger.error(`Setup verification failed: ${error.message}`);
  process.exit(1);
});
