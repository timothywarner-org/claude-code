/**
 * Segment 2: MCP Architecture Overview
 *
 * Visual explanation of Model Context Protocol architecture,
 * components, and how to build MCP servers.
 *
 * Run: npx tsx segment_2_mcp/02_mcp_architecture.ts
 */

import { logger } from '../src/utils/logger.js';

/**
 * Explain MCP core concepts
 */
function explainMCP(): void {
  logger.section('What is MCP?');

  console.log(`
Model Context Protocol (MCP) is an open standard for AI-tool communication.

┌─────────────────────────────────────────────────────────────────────────┐
│                         MCP Architecture                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐                                    ┌─────────────┐     │
│  │   Claude    │                                    │ MCP Server  │     │
│  │   (LLM)     │                                    │ (Your Code) │     │
│  └──────┬──────┘                                    └──────┬──────┘     │
│         │                                                  │            │
│         │  1. "What tools are available?"                  │            │
│         │─────────────────────────────────────────────────►│            │
│         │                                                  │            │
│         │  2. "remember_decision, recall_decisions, ..."   │            │
│         │◄─────────────────────────────────────────────────│            │
│         │                                                  │            │
│         │  3. remember_decision({ title: "Use PostgreSQL" })            │
│         │─────────────────────────────────────────────────►│            │
│         │                                                  │            │
│         │  4. { success: true, id: "dec_123" }             │            │
│         │◄─────────────────────────────────────────────────│            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
`);
}

/**
 * Explain the three MCP primitives
 */
function explainPrimitives(): void {
  logger.section('MCP Primitives');

  console.log(`
MCP defines three core primitives:

┌─────────────────────────────────────────────────────────────────────────┐
│  TOOLS - Functions Claude can call                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  • Execute operations (create, update, delete)                          │
│  • Query external systems                                               │
│  • Input validation via Zod schemas                                     │
│                                                                         │
│  Examples: remember_decision, query_database, send_slack_message        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  RESOURCES - Data Claude can read                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  • Files and documents                                                  │
│  • Database records                                                     │
│  • Identified by URI (e.g., memory://decisions)                         │
│                                                                         │
│  Examples: project-config, architecture-docs, team-conventions          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  PROMPTS - Reusable prompt templates                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  • Standardize common interactions                                      │
│  • Accept dynamic parameters                                            │
│  • Return structured message lists                                      │
│                                                                         │
│  Examples: code-review-template, bug-fix-prompt, docs-generator         │
└─────────────────────────────────────────────────────────────────────────┘
`);
}

/**
 * Show how to build an MCP server
 */
function showServerStructure(): void {
  logger.section('Building an MCP Server');

  const serverCode = `
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// 1. Create server instance
const server = new McpServer({
  name: 'my-mcp-server',
  version: '1.0.0',
});

// 2. Register a tool
server.tool(
  'remember_item',
  'Store an item for later recall',
  {
    key: z.string().describe('Unique identifier'),
    value: z.string().describe('Value to store'),
  },
  async ({ key, value }) => {
    memory[key] = value;  // Your storage logic
    return {
      content: [{ type: 'text', text: \`Stored: \${key}\` }],
    };
  }
);

// 3. Register a resource
server.resource(
  'memory://all',
  'All stored items',
  async () => ({
    contents: [{
      uri: 'memory://all',
      text: JSON.stringify(memory),
      mimeType: 'application/json',
    }],
  })
);

// 4. Connect transport and start
const transport = new StdioServerTransport();
await server.connect(transport);
`;

  logger.code(serverCode, 'TypeScript');
}

/**
 * Show CLI commands for MCP
 */
function showCLICommands(): void {
  logger.section('Claude Code MCP Commands');

  console.log(`
ADDING SERVERS
──────────────
# Add local server
claude mcp add memory -- npx tsx ./server.ts

# Add npm package
claude mcp add github -- npx -y @modelcontextprotocol/server-github

# Add with environment variables
claude mcp add github -- npx -y @modelcontextprotocol/server-github \\
  --env GITHUB_TOKEN=ghp_xxx

# Add via JSON
claude mcp add-json memory '{"command": "npx", "args": ["tsx", "./server.ts"]}'


MANAGING SERVERS
────────────────
claude mcp list         # List all configured servers
claude mcp remove NAME  # Remove a server
claude /mcp             # View available tools in Claude Code
claude --mcp-debug      # Debug MCP connections


CONFIGURATION FILES
───────────────────
# Project-level: .claude/settings.json
# User-level: ~/.claude/settings.json

{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["tsx", "./segment_2_mcp/memory_server/server.ts"]
    }
  }
}
`);
}

/**
 * Show comparison table
 */
function showComparison(): void {
  logger.section('MCP vs Traditional Approaches');

  console.log(`
┌────────────────────────┬────────────────────────┬────────────────────────┐
│ Feature                │ Without MCP            │ With MCP               │
├────────────────────────┼────────────────────────┼────────────────────────┤
│ Session Memory         │ Resets each session    │ Persists across all    │
│ Tool Discovery         │ Manual each time       │ Automatic              │
│ External Systems       │ Copy-paste data        │ Direct integration     │
│ Team Sharing           │ Repeat context         │ Shared memory server   │
│ Customization          │ Prompt engineering     │ Build custom servers   │
└────────────────────────┴────────────────────────┴────────────────────────┘
`);
}

/**
 * Main demo runner
 */
async function main(): Promise<void> {
  logger.section('MCP Architecture Deep Dive');

  explainMCP();
  explainPrimitives();
  showServerStructure();
  showCLICommands();
  showComparison();

  logger.section('Next Steps');
  console.log(`
1. Add the memory server to Claude Code:
   claude mcp add memory -- npx tsx ./segment_2_mcp/memory_server/server.ts

2. Test it in Claude Code:
   claude "Remember that we use TypeScript for this project"
   claude "What tech stack are we using?"

3. Explore official MCP servers:
   https://github.com/modelcontextprotocol/servers

4. Continue to Segment 3 to learn about agents!
`);
}

main().catch((error) => {
  logger.error(`Demo failed: ${error.message}`);
  process.exit(1);
});
