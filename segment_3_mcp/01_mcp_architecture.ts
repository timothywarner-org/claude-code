/**
 * Segment 3: MCP Architecture Deep Dive
 *
 * Comprehensive overview of Model Context Protocol architecture,
 * components, and communication patterns.
 *
 * Run: npx tsx segment_3_mcp/01_mcp_architecture.ts
 */

import { logger } from '../src/utils/logger.js';

/**
 * Explain MCP core concepts
 */
function explainCoreConcepts(): void {
  logger.section('MCP Core Concepts');

  console.log(`
Model Context Protocol (MCP) is an open standard for AI-tool communication.
It provides a structured way for LLMs to interact with external systems.

┌─────────────────────────────────────────────────────────────────────────┐
│                         MCP Communication Flow                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐                                    ┌─────────────┐    │
│  │   Claude    │                                    │ MCP Server  │    │
│  │   (LLM)     │                                    │ (Your Code) │    │
│  └──────┬──────┘                                    └──────┬──────┘    │
│         │                                                  │           │
│         │  1. Request tools/resources                      │           │
│         │─────────────────────────────────────────────────►│           │
│         │                                                  │           │
│         │  2. Return capabilities                          │           │
│         │◄─────────────────────────────────────────────────│           │
│         │                                                  │           │
│         │  3. Call tool with arguments                     │           │
│         │─────────────────────────────────────────────────►│           │
│         │                                                  │           │
│         │  4. Execute & return results                     │           │
│         │◄─────────────────────────────────────────────────│           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`);
}

/**
 * Explain MCP primitives
 */
function explainPrimitives(): void {
  logger.section('MCP Primitives');

  console.log(`
MCP defines three core primitives:

┌─────────────────────────────────────────────────────────────────────────┐
│  TOOLS                                                                  │
│  Functions that Claude can call to perform actions                      │
├─────────────────────────────────────────────────────────────────────────┤
│  • Execute operations (create, update, delete)                          │
│  • Query external systems                                               │
│  • Perform calculations                                                 │
│  • Input validation via JSON Schema or Zod                              │
│                                                                         │
│  Example: remember_decision, query_database, send_notification          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  RESOURCES                                                              │
│  Data that Claude can read (like a file system)                         │
├─────────────────────────────────────────────────────────────────────────┤
│  • Files and documents                                                  │
│  • Database records                                                     │
│  • API responses                                                        │
│  • Identified by URI (e.g., memory://decisions)                         │
│                                                                         │
│  Example: project-config, architecture-docs, team-conventions           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  PROMPTS                                                                │
│  Reusable prompt templates with arguments                               │
├─────────────────────────────────────────────────────────────────────────┤
│  • Standardize common interactions                                      │
│  • Accept dynamic parameters                                            │
│  • Return structured message lists                                      │
│                                                                         │
│  Example: code-review-prompt, bug-fix-prompt, documentation-prompt      │
└─────────────────────────────────────────────────────────────────────────┘
`);
}

/**
 * Explain transport mechanisms
 */
function explainTransports(): void {
  logger.section('Transport Mechanisms');

  console.log(`
MCP supports multiple transport mechanisms:

┌─────────────────────────────────────────────────────────────────────────┐
│  STDIO (Standard Input/Output)                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  • Most common for local integrations                                   │
│  • Server runs as child process                                         │
│  • Communication via stdin/stdout                                       │
│  • Used by Claude Desktop and Claude Code                               │
│                                                                         │
│  Configuration:                                                         │
│  {                                                                      │
│    "command": "npx",                                                    │
│    "args": ["tsx", "./server.ts"],                                      │
│    "env": { "API_KEY": "..." }                                          │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  HTTP + Server-Sent Events (SSE)                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  • For remote/networked servers                                         │
│  • Streamable responses                                                 │
│  • Supports authentication                                              │
│  • Stateless design with session management                             │
│                                                                         │
│  Endpoints:                                                             │
│  POST /mcp/message  - Send messages to server                           │
│  GET  /mcp/sse      - Receive server events                             │
└─────────────────────────────────────────────────────────────────────────┘
`);
}

/**
 * Show TypeScript server structure
 */
function showServerStructure(): void {
  logger.section('MCP Server Structure (TypeScript)');

  const serverCode = `
// server.ts - Basic MCP server structure
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

// 1. Create server instance
const server = new McpServer({
  name: 'my-mcp-server',
  version: '1.0.0',
});

// 2. Register tools
server.registerTool(
  'tool_name',
  {
    title: 'Human-Readable Title',
    description: 'What this tool does',
    inputSchema: {
      param1: z.string().describe('Parameter description'),
      param2: z.number().optional(),
    },
  },
  async ({ param1, param2 }) => {
    // Tool implementation
    const result = await doSomething(param1, param2);

    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  }
);

// 3. Register resources
server.registerResource(
  'resource_name',
  'resource://identifier',
  {
    title: 'Resource Title',
    description: 'What this resource provides',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify(data),
    }],
  })
);

// 4. Register prompts
server.registerPrompt(
  'prompt_name',
  {
    title: 'Prompt Title',
    description: 'When to use this prompt',
    argsSchema: {
      arg1: z.string(),
    },
  },
  ({ arg1 }) => ({
    messages: [
      {
        role: 'user',
        content: { type: 'text', text: \`Process: \${arg1}\` },
      },
    ],
  })
);

// 5. Connect transport and start
const transport = new StdioServerTransport();
await server.connect(transport);
`;

  logger.code(serverCode, 'TypeScript');
}

/**
 * Show tool result types
 */
function showToolResults(): void {
  logger.section('Tool Result Types');

  console.log(`
Tools can return different content types:

┌─────────────────────────────────────────────────────────────────────────┐
│  TEXT CONTENT                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│  return {                                                               │
│    content: [{ type: 'text', text: 'Result message' }]                  │
│  };                                                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  IMAGE CONTENT                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  return {                                                               │
│    content: [{                                                          │
│      type: 'image',                                                     │
│      data: base64EncodedImage,                                          │
│      mimeType: 'image/png'                                              │
│    }]                                                                   │
│  };                                                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  RESOURCE LINK (for large resources)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  return {                                                               │
│    content: [{                                                          │
│      type: 'resource_link',                                             │
│      uri: 'file:///path/to/large/file.ts',                              │
│      name: 'Large File',                                                │
│      mimeType: 'text/typescript'                                        │
│    }]                                                                   │
│  };                                                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  STRUCTURED OUTPUT (with schema validation)                             │
├─────────────────────────────────────────────────────────────────────────┤
│  return {                                                               │
│    content: [{ type: 'text', text: JSON.stringify(data) }],             │
│    structuredContent: data  // Validated against outputSchema           │
│  };                                                                     │
└─────────────────────────────────────────────────────────────────────────┘
`);
}

/**
 * Show best practices
 */
function showBestPractices(): void {
  logger.section('MCP Best Practices');

  console.log(`
1. TOOL DESIGN
   ✓ Use descriptive names and descriptions
   ✓ Validate inputs with Zod schemas
   ✓ Return structured, parseable results
   ✓ Handle errors gracefully
   ✗ Don't expose sensitive operations without auth

2. RESOURCE DESIGN
   ✓ Use clear URI schemes (memory://, config://, etc.)
   ✓ Include appropriate MIME types
   ✓ Cache when appropriate
   ✗ Don't load huge resources synchronously

3. SECURITY
   ✓ Validate all inputs
   ✓ Use environment variables for secrets
   ✓ Implement rate limiting
   ✓ Log access for auditing
   ✗ Never expose raw database access

4. PERFORMANCE
   ✓ Keep tools focused and fast
   ✓ Use resource links for large data
   ✓ Implement caching strategies
   ✗ Don't block on long operations

5. ERROR HANDLING
   ✓ Return meaningful error messages
   ✓ Use appropriate error types
   ✓ Include recovery suggestions
   ✗ Don't expose stack traces to users
`);
}

/**
 * Main demo runner
 */
async function main(): Promise<void> {
  logger.section('MCP Architecture Deep Dive');

  explainCoreConcepts();
  explainPrimitives();
  explainTransports();
  showServerStructure();
  showToolResults();
  showBestPractices();

  logger.section('Next: Build Your Own MCP Server');
  console.log(`
In the next file, we'll build a complete JSON-based memory server
that persists project context across Claude sessions.

Run: npx tsx segment_3_mcp/02_json_memory_server/server.ts
`);
}

main().catch((error) => {
  logger.error(`Demo failed: ${error.message}`);
  process.exit(1);
});
