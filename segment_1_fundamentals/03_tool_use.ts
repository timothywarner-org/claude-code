/**
 * Segment 1: Tool Use (Function Calling) Demo
 *
 * Shows how Claude can use tools to interact with external systems.
 * This is the foundation for building agentic workflows.
 *
 * Run: npx tsx segment_1_fundamentals/03_tool_use.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient, getModel } from '../src/utils/client.js';
import { logger } from '../src/utils/logger.js';

// Define tool types
interface ToolInput {
  [key: string]: unknown;
}

interface FileSystemInput extends ToolInput {
  path: string;
}

interface CalculatorInput extends ToolInput {
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  a: number;
  b: number;
}

interface WebSearchInput extends ToolInput {
  query: string;
  maxResults?: number;
}

/**
 * Define available tools for Claude
 */
const tools: Anthropic.Tool[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file from the filesystem',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to read',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_directory',
    description: 'List files and directories in a given path',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The directory path to list',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'calculator',
    description: 'Perform basic arithmetic calculations',
    input_schema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['add', 'subtract', 'multiply', 'divide'],
          description: 'The arithmetic operation to perform',
        },
        a: {
          type: 'number',
          description: 'First operand',
        },
        b: {
          type: 'number',
          description: 'Second operand',
        },
      },
      required: ['operation', 'a', 'b'],
    },
  },
  {
    name: 'web_search',
    description: 'Search the web for information (simulated)',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
];

/**
 * Execute a tool call and return the result
 */
function executeTool(name: string, input: ToolInput): string {
  logger.info(`Executing tool: ${name}`, 'Tool');
  logger.json(input, 'Input');

  switch (name) {
    case 'read_file': {
      const { path } = input as FileSystemInput;
      // Simulated file read
      if (path === 'package.json') {
        return JSON.stringify({ name: 'demo-project', version: '1.0.0' });
      }
      return `Contents of ${path}: [simulated file content]`;
    }

    case 'list_directory': {
      const { path } = input as FileSystemInput;
      // Simulated directory listing
      return JSON.stringify([
        { name: 'src', type: 'directory' },
        { name: 'package.json', type: 'file' },
        { name: 'tsconfig.json', type: 'file' },
        { name: 'README.md', type: 'file' },
      ]);
    }

    case 'calculator': {
      const { operation, a, b } = input as CalculatorInput;
      let result: number;
      switch (operation) {
        case 'add':
          result = a + b;
          break;
        case 'subtract':
          result = a - b;
          break;
        case 'multiply':
          result = a * b;
          break;
        case 'divide':
          result = b !== 0 ? a / b : NaN;
          break;
      }
      return `${a} ${operation} ${b} = ${result}`;
    }

    case 'web_search': {
      const { query } = input as WebSearchInput;
      // Simulated search results
      return JSON.stringify([
        { title: `Result 1 for "${query}"`, url: 'https://example.com/1' },
        { title: `Result 2 for "${query}"`, url: 'https://example.com/2' },
      ]);
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

/**
 * Run an agentic loop that handles tool calls
 */
async function runAgentLoop(client: Anthropic, userMessage: string): Promise<void> {
  logger.subsection('Starting Agent Loop');
  logger.info(`User: ${userMessage}`, 'Input');

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  let continueLoop = true;
  let iteration = 0;
  const maxIterations = 10;

  while (continueLoop && iteration < maxIterations) {
    iteration++;
    logger.info(`Iteration ${iteration}`, 'Loop');

    const response = await client.messages.create({
      model: getModel(),
      max_tokens: 1024,
      tools,
      messages,
    });

    logger.info(`Stop reason: ${response.stop_reason}`, 'Response');

    // Check if we need to handle tool calls
    if (response.stop_reason === 'tool_use') {
      // Process all tool calls in the response
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          logger.subsection(`Tool Call: ${block.name}`);

          const result = executeTool(block.name, block.input as ToolInput);
          logger.info(`Result: ${result.substring(0, 100)}...`, 'Tool');

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        } else if (block.type === 'text' && block.text) {
          logger.info(`Claude: ${block.text}`, 'Response');
        }
      }

      // Add assistant response and tool results to messages
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    } else {
      // No more tool calls, extract final response
      continueLoop = false;

      for (const block of response.content) {
        if (block.type === 'text') {
          logger.subsection('Final Response');
          console.log(block.text);
        }
      }
    }
  }

  if (iteration >= maxIterations) {
    logger.warn('Max iterations reached', 'Loop');
  }
}

/**
 * Main demo runner
 */
async function main(): Promise<void> {
  logger.section('Tool Use (Function Calling) Demo');

  const client = createClient();

  // Demo 1: Simple calculation
  logger.section('Demo 1: Calculator Tool');
  await runAgentLoop(
    client,
    'What is 42 multiplied by 17, then divided by 3?'
  );

  // Demo 2: File system exploration
  logger.section('Demo 2: File System Tools');
  await runAgentLoop(
    client,
    'List the contents of the current directory and read the package.json file.'
  );

  // Demo 3: Multi-tool usage
  logger.section('Demo 3: Combined Tool Usage');
  await runAgentLoop(
    client,
    'Search for "TypeScript best practices" and then calculate how many results you found times 100.'
  );

  logger.section('Demo Complete');
  logger.info('Tool use enables Claude to interact with external systems!', 'Summary');
}

main().catch((error) => {
  logger.error(`Demo failed: ${error.message}`);
  process.exit(1);
});
