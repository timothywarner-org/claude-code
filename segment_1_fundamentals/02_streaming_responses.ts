/**
 * Segment 1: Streaming Responses Demo
 *
 * Demonstrates Claude's streaming capabilities for real-time output.
 * Essential for building responsive AI-powered tools.
 *
 * Run: npx tsx segment_1_fundamentals/02_streaming_responses.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient, getModel } from '../src/utils/client.js';
import { logger } from '../src/utils/logger.js';

/**
 * Demo 1: Basic streaming with async iterator
 */
async function basicStreaming(client: Anthropic): Promise<void> {
  logger.subsection('Basic Streaming (Async Iterator)');

  const stream = await client.messages.create({
    model: getModel(),
    max_tokens: 500,
    stream: true,
    messages: [
      {
        role: 'user',
        content: 'Explain the benefits of streaming API responses in 3 bullet points.',
      },
    ],
  });

  logger.info('Streaming response:', 'Demo');
  console.log('');

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      process.stdout.write(event.delta.text);
    }
  }

  console.log('\n');
}

/**
 * Demo 2: Stream with event handlers
 */
async function eventHandlerStreaming(client: Anthropic): Promise<void> {
  logger.subsection('Event Handler Streaming');

  let inputTokens = 0;
  let outputTokens = 0;

  const stream = client.messages
    .stream({
      model: getModel(),
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: 'Write a haiku about TypeScript.',
        },
      ],
    })
    .on('message', (message) => {
      inputTokens = message.usage.input_tokens;
    })
    .on('text', (text) => {
      process.stdout.write(text);
    })
    .on('finalMessage', (message) => {
      outputTokens = message.usage.output_tokens;
    });

  await stream.finalMessage();

  console.log('\n');
  logger.info(`Tokens used - Input: ${inputTokens}, Output: ${outputTokens}`, 'Stats');
}

/**
 * Demo 3: Streaming with progress tracking
 */
async function streamingWithProgress(client: Anthropic): Promise<void> {
  logger.subsection('Streaming with Progress Tracking');

  const task = 'Generate a simple Express.js server with 3 endpoints';

  logger.info(`Task: ${task}`, 'Demo');
  console.log('');

  let charCount = 0;
  const startTime = Date.now();

  const stream = client.messages.stream({
    model: getModel(),
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `${task}. Include TypeScript types.`,
      },
    ],
  });

  stream.on('text', (text) => {
    process.stdout.write(text);
    charCount += text.length;
  });

  await stream.finalMessage();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const charsPerSecond = (charCount / parseFloat(duration)).toFixed(0);

  console.log('\n');
  logger.info(`Generated ${charCount} characters in ${duration}s (${charsPerSecond} chars/sec)`, 'Stats');
}

/**
 * Demo 4: Handling stream events for UI updates
 */
async function streamEventsDemo(client: Anthropic): Promise<void> {
  logger.subsection('Stream Events for UI Updates');

  const stream = await client.messages.create({
    model: getModel(),
    max_tokens: 300,
    stream: true,
    messages: [
      {
        role: 'user',
        content: 'List 3 TypeScript best practices.',
      },
    ],
  });

  logger.info('Event types received:', 'Demo');

  const eventCounts: Record<string, number> = {};

  for await (const event of stream) {
    eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;

    // Handle different event types
    switch (event.type) {
      case 'message_start':
        logger.info('  → Message started', 'Event');
        break;
      case 'content_block_start':
        logger.info('  → Content block started', 'Event');
        break;
      case 'content_block_delta':
        if (event.delta.type === 'text_delta') {
          process.stdout.write(event.delta.text);
        }
        break;
      case 'content_block_stop':
        console.log('');
        logger.info('  → Content block completed', 'Event');
        break;
      case 'message_stop':
        logger.info('  → Message completed', 'Event');
        break;
    }
  }

  console.log('');
  logger.subsection('Event Summary');
  for (const [type, count] of Object.entries(eventCounts)) {
    logger.info(`  ${type}: ${count}`, 'Summary');
  }
}

/**
 * Main demo runner
 */
async function main(): Promise<void> {
  logger.section('Streaming Responses Demo');

  const client = createClient();

  // Run all demos
  await basicStreaming(client);
  await eventHandlerStreaming(client);
  await streamingWithProgress(client);
  await streamEventsDemo(client);

  logger.section('Demo Complete');
  logger.info('Streaming enables responsive UIs and real-time feedback!', 'Summary');
}

main().catch((error) => {
  logger.error(`Demo failed: ${error.message}`);
  process.exit(1);
});
