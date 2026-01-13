/**
 * Segment 3: Agent Loop Pattern
 *
 * Demonstrates how to build an agentic loop with Claude.
 * The agent plans, executes tools, and iterates until done.
 *
 * Run: npx tsx segment_3_agents/02_agent_loop.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient, getModel } from '../src/utils/client.js';
import { logger } from '../src/utils/logger.js';

// Define tool types
interface ToolInput {
  [key: string]: unknown;
}

interface FileReadInput extends ToolInput {
  path: string;
}

interface FileSearchInput extends ToolInput {
  pattern: string;
  directory?: string;
}

interface FileEditInput extends ToolInput {
  path: string;
  oldContent: string;
  newContent: string;
}

/**
 * Define available tools for the agent
 */
const tools: Anthropic.Tool[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to read',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_files',
    description: 'Search for files matching a pattern',
    input_schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern or keyword to search for',
        },
        directory: {
          type: 'string',
          description: 'Directory to search in (default: current)',
        },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'edit_file',
    description: 'Edit a file by replacing content',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to edit',
        },
        oldContent: {
          type: 'string',
          description: 'Content to find and replace',
        },
        newContent: {
          type: 'string',
          description: 'New content to insert',
        },
      },
      required: ['path', 'oldContent', 'newContent'],
    },
  },
  {
    name: 'task_complete',
    description: 'Mark the task as complete and provide summary',
    input_schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Summary of what was accomplished',
        },
      },
      required: ['summary'],
    },
  },
];

// Simulated file system for demo
const fileSystem: Record<string, string> = {
  'src/api.ts': `
export function getUser(id: string) {
  // TODO: Add error handling
  return db.users.find(id);
}

export function deleteUser(id: string) {
  // TODO: Add authorization check
  return db.users.delete(id);
}
`,
  'src/utils.ts': `
export function formatDate(date: Date) {
  // TODO: Use proper date library
  return date.toISOString();
}
`,
};

/**
 * Execute a tool and return the result
 */
function executeTool(name: string, input: ToolInput): string {
  logger.info(`Tool: ${name}`, 'Agent');

  switch (name) {
    case 'read_file': {
      const { path } = input as FileReadInput;
      const content = fileSystem[path];
      if (content) {
        return `File contents of ${path}:\n${content}`;
      }
      return `Error: File not found: ${path}`;
    }

    case 'search_files': {
      const { pattern } = input as FileSearchInput;
      const matches = Object.keys(fileSystem).filter((f) =>
        f.includes(pattern) || fileSystem[f].toLowerCase().includes(pattern.toLowerCase())
      );
      return `Found ${matches.length} files:\n${matches.join('\n')}`;
    }

    case 'edit_file': {
      const { path, oldContent, newContent } = input as FileEditInput;
      if (!fileSystem[path]) {
        return `Error: File not found: ${path}`;
      }
      if (!fileSystem[path].includes(oldContent)) {
        return `Error: Content not found in ${path}`;
      }
      fileSystem[path] = fileSystem[path].replace(oldContent, newContent);
      return `Successfully edited ${path}`;
    }

    case 'task_complete': {
      return `Task completed: ${(input as { summary: string }).summary}`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

/**
 * Run the agentic loop
 */
async function runAgent(client: Anthropic, task: string): Promise<void> {
  logger.section('Starting Agent');
  logger.info(`Task: ${task}`, 'Agent');

  const systemPrompt = `You are an autonomous coding agent. You have access to tools for reading, searching, and editing files.

Your approach:
1. Understand the task
2. Search for relevant files
3. Read and analyze code
4. Make necessary edits
5. Call task_complete when done

Be methodical and explain your reasoning. If you encounter an error, try a different approach.`;

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: task },
  ];

  let iteration = 0;
  const maxIterations = 10;
  let taskCompleted = false;

  while (!taskCompleted && iteration < maxIterations) {
    iteration++;
    logger.subsection(`Iteration ${iteration}`);

    const response = await client.messages.create({
      model: getModel(),
      max_tokens: 2048,
      system: systemPrompt,
      tools,
      messages,
    });

    // Process the response
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === 'text' && block.text) {
        logger.info(`Thinking: ${block.text.substring(0, 200)}...`, 'Agent');
      }

      if (block.type === 'tool_use') {
        console.log(`  → ${block.name}(${JSON.stringify(block.input).substring(0, 50)}...)`);

        // Check if task is complete
        if (block.name === 'task_complete') {
          taskCompleted = true;
          const result = executeTool(block.name, block.input as ToolInput);
          logger.success(result, 'Agent');
          break;
        }

        const result = executeTool(block.name, block.input as ToolInput);
        console.log(`    Result: ${result.substring(0, 100)}...`);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }
    }

    // If we have tool results, continue the loop
    if (toolResults.length > 0 && !taskCompleted) {
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }

    // If no tool calls and not complete, we're stuck
    if (response.stop_reason === 'end_turn' && !taskCompleted) {
      logger.warn('Agent stopped without completing task', 'Agent');
      break;
    }
  }

  if (iteration >= maxIterations) {
    logger.warn('Max iterations reached', 'Agent');
  }

  logger.section('Agent Complete');
  logger.info(`Iterations: ${iteration}`, 'Stats');
}

/**
 * Main demo
 */
async function main(): Promise<void> {
  logger.section('Agent Loop Demo');

  console.log(`
This demo shows an autonomous agent that:
1. Searches for TODO comments
2. Reads the files
3. Analyzes what needs to be done
4. Reports findings

In a real scenario, it could also fix the issues.
`);

  const client = createClient();

  // Run the agent
  await runAgent(
    client,
    'Find all TODO comments in the codebase and list what needs to be done.'
  );

  logger.section('Key Takeaways');
  console.log(`
Agentic patterns:
1. Tool Loop: Call tools → observe results → decide next action
2. Self-correction: Handle errors and try alternatives
3. Task completion: Know when to stop
4. Bounded iterations: Prevent infinite loops

In Claude Code, this happens automatically when you give it a complex task.
Try: claude "Find all console.log statements and replace with proper logging"
`);
}

main().catch((error) => {
  logger.error(`Agent failed: ${error.message}`);
  process.exit(1);
});
