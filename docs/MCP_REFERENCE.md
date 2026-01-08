# MCP (Model Context Protocol) Reference

Quick reference guide for building and using MCP servers with Claude Code.

## What is MCP?

The Model Context Protocol (MCP) is an open standard that enables AI assistants like Claude to securely connect to external data sources and tools. MCP servers provide:

- **Tools**: Actions Claude can execute (run commands, call APIs, modify data)
- **Resources**: Data Claude can read (files, database content, configurations)
- **Prompts**: Pre-built prompt templates for common tasks

## Architecture Overview

```
┌─────────────────┐     stdio/SSE      ┌─────────────────┐
│   Claude Code   │◄──────────────────►│   MCP Server    │
│    (Client)     │                    │  (Your Code)    │
└─────────────────┘                    └─────────────────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │  External   │
                                       │  Services   │
                                       └─────────────┘
```

## Quick Start: Building an MCP Server

### 1. Install the SDK

```bash
npm install @modelcontextprotocol/sdk zod
```

### 2. Create a Basic Server

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Create server
const server = new McpServer({
  name: 'my-server',
  version: '1.0.0',
});

// Add a tool
server.tool(
  'greet',                              // Tool name
  'Greet a user by name',               // Description
  { name: z.string() },                 // Input schema (Zod)
  async ({ name }) => ({                // Handler
    content: [{ type: 'text', text: `Hello, ${name}!` }],
  })
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 3. Register with Claude Code

```bash
claude mcp add my-server -- npx tsx /path/to/server.ts
```

## Tools

Tools are actions that Claude can execute. They take input and produce output.

### Defining Tools

```typescript
server.tool(
  'tool_name',           // Unique identifier
  'Description',         // What the tool does
  {                      // Input schema using Zod
    param1: z.string().describe('Description'),
    param2: z.number().optional(),
  },
  async (input) => {     // Handler function
    // Do something with input
    return {
      content: [
        { type: 'text', text: 'Result' }
      ],
    };
  }
);
```

### Tool Response Format

```typescript
// Text response
{
  content: [
    { type: 'text', text: 'Your result here' }
  ]
}

// Multiple content items
{
  content: [
    { type: 'text', text: 'Summary' },
    { type: 'text', text: JSON.stringify(data) }
  ]
}

// Error response
{
  content: [
    { type: 'text', text: 'Error: Something went wrong' }
  ],
  isError: true
}
```

### Common Tool Patterns

```typescript
// CRUD operations
server.tool('create_item', '...', { data: z.object({...}) }, async ({ data }) => {...});
server.tool('read_item', '...', { id: z.string() }, async ({ id }) => {...});
server.tool('update_item', '...', { id: z.string(), data: z.object({...}) }, async (...) => {...});
server.tool('delete_item', '...', { id: z.string() }, async ({ id }) => {...});

// Search/query
server.tool('search', '...', { query: z.string(), limit: z.number().optional() }, async (...) => {...});

// External API calls
server.tool('fetch_data', '...', { url: z.string() }, async ({ url }) => {
  const response = await fetch(url);
  return { content: [{ type: 'text', text: await response.text() }] };
});
```

## Resources

Resources provide read-only access to data.

### Defining Resources

```typescript
server.resource(
  'resource_name',                    // Unique name
  'protocol://uri',                   // URI pattern
  async (uri) => ({                   // Handler
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(data),
      },
    ],
  })
);
```

### Common Resource Patterns

```typescript
// JSON data
server.resource('config', 'myserver://config', async () => ({
  contents: [{
    uri: 'myserver://config',
    mimeType: 'application/json',
    text: JSON.stringify(config),
  }],
}));

// Markdown documentation
server.resource('docs', 'myserver://docs', async () => ({
  contents: [{
    uri: 'myserver://docs',
    mimeType: 'text/markdown',
    text: '# Documentation\n...',
  }],
}));

// Dynamic resource with parameters
server.resource('item', 'myserver://items/{id}', async (uri) => {
  const id = uri.pathname.split('/').pop();
  const item = await getItem(id);
  return {
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(item),
    }],
  };
});
```

## Prompts

Prompts are pre-built templates for common tasks.

### Defining Prompts

```typescript
server.prompt(
  'prompt_name',                      // Unique name
  'Description of the prompt',        // What it does
  async () => ({                      // Handler
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: 'Your prompt template here',
        },
      },
    ],
  })
);
```

### Prompts with Arguments

```typescript
server.prompt(
  'analyze_code',
  'Analyze code for issues',
  {
    language: z.string().describe('Programming language'),
    focus: z.enum(['security', 'performance', 'style']).optional(),
  },
  async ({ language, focus }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze the following ${language} code${focus ? ` focusing on ${focus}` : ''}:`,
        },
      },
    ],
  })
);
```

## Transport Options

### Stdio (Default)

Best for local development and Claude Code CLI:

```typescript
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const transport = new StdioServerTransport();
await server.connect(transport);
```

### SSE (Server-Sent Events)

For web deployments:

```typescript
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';

const app = express();
const transport = new SSEServerTransport('/mcp', app);
await server.connect(transport);
app.listen(3000);
```

## Claude Code Integration

### Adding Servers

```bash
# Local script
claude mcp add server-name -- npx tsx /path/to/server.ts

# npm package
claude mcp add server-name -- npx @scope/mcp-server

# With arguments
claude mcp add server-name -- node server.js --port 3000
```

### Listing Servers

```bash
claude mcp list
```

### Removing Servers

```bash
claude mcp remove server-name
```

### Configuration File

MCP servers are configured in `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/path/to/memory/dist/index.js"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_..."
      }
    }
  }
}
```

## Best Practices

### 1. Clear Tool Descriptions

```typescript
// ❌ Bad
server.tool('get', 'Gets stuff', {...}, async () => {...});

// ✅ Good
server.tool(
  'get_user_profile',
  'Retrieves a user profile by ID including name, email, and preferences',
  { userId: z.string().describe('The unique user identifier') },
  async () => {...}
);
```

### 2. Validate Inputs

```typescript
server.tool(
  'create_item',
  'Create a new item',
  {
    name: z.string().min(1).max(100),
    priority: z.number().int().min(1).max(10),
    tags: z.array(z.string()).max(20).optional(),
  },
  async (input) => {...}
);
```

### 3. Handle Errors Gracefully

```typescript
server.tool('risky_operation', '...', {...}, async (input) => {
  try {
    const result = await doSomething(input);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});
```

### 4. Keep Responses Concise

```typescript
// ❌ Bad - too much data
return { content: [{ type: 'text', text: JSON.stringify(entireDatabase) }] };

// ✅ Good - relevant summary
return {
  content: [{
    type: 'text',
    text: `Found ${items.length} items. Top 5: ${items.slice(0, 5).map(i => i.name).join(', ')}`,
  }],
};
```

### 5. Security Considerations

- Never expose sensitive credentials through tools
- Validate and sanitize all inputs
- Implement proper authentication for external APIs
- Log tool usage for audit trails
- Use environment variables for secrets

## Official MCP Servers

Pre-built servers available from Anthropic:

| Server | Description | Install |
|--------|-------------|---------|
| GitHub | GitHub API integration | `npx @modelcontextprotocol/server-github` |
| Slack | Slack workspace access | `npx @modelcontextprotocol/server-slack` |
| Filesystem | Local file operations | `npx @modelcontextprotocol/server-filesystem` |
| PostgreSQL | Database queries | `npx @modelcontextprotocol/server-postgres` |
| Google Drive | Drive file access | `npx @modelcontextprotocol/server-gdrive` |

Browse more at [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)

## Additional Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Example Servers](https://github.com/modelcontextprotocol/servers)
