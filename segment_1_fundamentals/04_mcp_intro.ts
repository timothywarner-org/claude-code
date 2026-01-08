/**
 * Segment 1: Introduction to Model Context Protocol (MCP)
 *
 * MCP provides a standardized way for AI models to interact with
 * external tools and data sources. This demo introduces the concepts.
 *
 * Run: npx tsx segment_1_fundamentals/04_mcp_intro.ts
 */

import { logger } from '../src/utils/logger.js';

/**
 * MCP Architecture Overview
 */
function explainMCPArchitecture(): void {
  logger.section('What is MCP?');

  console.log(`
Model Context Protocol (MCP) is an open standard that enables AI assistants
to securely connect to external data sources and tools.

┌─────────────────────────────────────────────────────────────────────┐
│                        MCP Architecture                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐        ┌──────────────┐       ┌──────────────┐   │
│   │   Claude     │◄──────►│  MCP Host    │◄─────►│ MCP Server   │   │
│   │   (LLM)      │        │  (Client)    │       │ (Your Code)  │   │
│   └──────────────┘        └──────────────┘       └──────────────┘   │
│                                  │                      │           │
│                                  │                      ▼           │
│                                  │               ┌──────────────┐   │
│                                  │               │  Resources   │   │
│                                  │               │  - Files     │   │
│                                  │               │  - APIs      │   │
│                                  │               │  - Databases │   │
│                                  │               └──────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
`);

  logger.subsection('Key Concepts');

  console.log(`
1. **MCP Hosts** (Clients)
   Applications like Claude Desktop, IDEs, or custom apps that connect to MCP servers.

2. **MCP Servers**
   Lightweight services that expose tools, resources, and prompts.
   You build these to give Claude access to your systems.

3. **Transports**
   Communication channels between hosts and servers:
   - stdio: Local processes (most common for desktop)
   - HTTP/SSE: Remote servers with streaming

4. **Primitives**
   - Tools: Functions Claude can call (like APIs)
   - Resources: Data Claude can read (like files)
   - Prompts: Reusable prompt templates
`);
}

/**
 * Show MCP server example structure
 */
function showServerExample(): void {
  logger.section('MCP Server Example (TypeScript)');

  const serverCode = `
import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

// Create server instance
const server = new McpServer({
  name: 'my-memory-server',
  version: '1.0.0',
});

// Register a tool
server.registerTool(
  'remember',
  {
    title: 'Remember Information',
    description: 'Store information for later recall',
    inputSchema: {
      key: z.string().describe('Unique identifier'),
      value: z.string().describe('Information to remember'),
    },
  },
  async ({ key, value }) => {
    // Store in memory/database
    memory[key] = value;
    return {
      content: [{ type: 'text', text: \`Remembered: \${key}\` }],
    };
  }
);

// Register a resource
server.registerResource(
  'memory',
  'memory://all',
  {
    title: 'All Memories',
    description: 'View all stored memories',
    mimeType: 'application/json',
  },
  async () => ({
    contents: [{ uri: 'memory://all', text: JSON.stringify(memory) }],
  })
);
`;

  logger.code(serverCode, 'TypeScript');
}

/**
 * Compare MCP to traditional tool use
 */
function compareMCPvsTools(): void {
  logger.section('MCP vs Traditional Tool Use');

  console.log(`
┌────────────────────────┬────────────────────────┬────────────────────────┐
│ Feature                │ Traditional Tools      │ MCP                    │
├────────────────────────┼────────────────────────┼────────────────────────┤
│ Setup                  │ Define per-request     │ Define once, reuse     │
│ Discovery              │ Manual                 │ Automatic              │
│ State                  │ Stateless              │ Persistent             │
│ Security               │ Custom implementation  │ Built-in sandboxing    │
│ Composability          │ Limited                │ Server chaining        │
│ Cross-platform         │ Varies                 │ Standardized           │
└────────────────────────┴────────────────────────┴────────────────────────┘

Why MCP matters:
- **Persistence**: Claude remembers context across sessions
- **Standardization**: One protocol, many tools
- **Security**: Controlled access to resources
- **Ecosystem**: Growing library of MCP servers
`);
}

/**
 * Show real-world MCP use cases
 */
function showUseCases(): void {
  logger.section('MCP Use Cases');

  const useCases = [
    {
      name: 'Project Memory',
      description: 'Store architectural decisions, coding patterns, team conventions',
      example: 'Claude remembers your API design choices across sessions',
    },
    {
      name: 'Database Access',
      description: 'Query databases with natural language',
      example: 'Ask Claude to find all users who signed up last week',
    },
    {
      name: 'GitHub Integration',
      description: 'Read/write code, create PRs, manage issues',
      example: 'Claude reviews PRs and suggests improvements',
    },
    {
      name: 'Documentation',
      description: 'Access and update project documentation',
      example: 'Claude keeps your API docs in sync with code',
    },
    {
      name: 'Monitoring',
      description: 'Access logs, metrics, and alerts',
      example: 'Ask Claude to analyze error patterns from last hour',
    },
  ];

  for (const useCase of useCases) {
    logger.subsection(useCase.name);
    console.log(`  ${useCase.description}`);
    console.log(`  Example: ${useCase.example}\n`);
  }
}

/**
 * Show how to configure MCP in Claude Code
 */
function showClaudeCodeConfig(): void {
  logger.section('Configuring MCP in Claude Code');

  const configExample = `
// ~/.claude/settings.json or .claude/settings.json (project-level)
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["tsx", "./mcp_servers/memory_server/server.ts"],
      "env": {
        "MEMORY_PATH": "./data/memory.json"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "\${GITHUB_TOKEN}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./src"]
    }
  }
}
`;

  logger.code(configExample, 'JSON');

  console.log(`
To add an MCP server via CLI:
  $ claude mcp add memory -- npx tsx ./mcp_servers/memory_server/server.ts

To test your MCP server:
  $ claude --mcp-debug

To see available tools from MCP servers:
  $ claude /mcp
`);
}

/**
 * Main demo runner
 */
async function main(): Promise<void> {
  logger.section('Introduction to Model Context Protocol (MCP)');

  explainMCPArchitecture();
  showServerExample();
  compareMCPvsTools();
  showUseCases();
  showClaudeCodeConfig();

  logger.section('Next Steps');
  console.log(`
In Segment 3, we'll build production MCP servers including:
- A JSON-based memory server for project context
- GitHub integration for code operations
- Slack integration for team notifications

For now, explore the official MCP servers:
  https://github.com/modelcontextprotocol/servers
`);
}

main().catch((error) => {
  logger.error(`Demo failed: ${error.message}`);
  process.exit(1);
});
