# Exercise 1: Build a Custom MCP Tool from Scratch

## Learning Objectives

By the end of this exercise, you will be able to:

1. Understand the Model Context Protocol (MCP) architecture and message flow
2. Create a functional MCP server with custom tools
3. Implement request/response handling following MCP specifications
4. Register your MCP server with Claude Code for persistent use
5. Debug and test MCP tools in development

## Prerequisites

- Node.js 18+ installed
- TypeScript basics
- Claude Code CLI installed and authenticated
- Familiarity with JSON-RPC 2.0 (helpful but not required)

## Background

The Model Context Protocol (MCP) enables Claude to interact with external tools and data
sources through a standardized interface. MCP servers expose "tools" that Claude can call
during conversations, extending its capabilities beyond text generation.

Key MCP concepts:

- **Server**: A process that exposes tools to Claude
- **Tool**: A callable function with a defined schema
- **Transport**: Communication layer (stdio, HTTP, WebSocket)

## Step-by-Step Instructions

### Step 1: Examine the Starter Code

Open `exercise_1_starter.ts` and review the skeleton structure. You will see:

- Basic MCP server setup using `@modelcontextprotocol/sdk`
- Empty tool registration
- Placeholder request handler

### Step 2: Define Your Tool Schema

Create a tool that fetches weather data for a given city. Define the tool schema:

```typescript
{
  name: 'get_weather',
  description: 'Get current weather for a city',
  inputSchema: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City name (e.g., "San Francisco")'
      },
      units: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    required: ['city']
  }
}
```

### Step 3: Implement the Tool Handler

Add logic to handle incoming tool calls:

1. Parse the input arguments
2. Validate required fields
3. Simulate weather data (or call a real API)
4. Return formatted response

### Step 4: Register Tool Listing

Implement the `tools/list` handler to expose your tool to Claude:

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Your tool schema here
    ]
  };
});
```

### Step 5: Handle Tool Execution

Implement the `tools/call` handler:

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_weather') {
    // Your implementation here
  }

  throw new Error(`Unknown tool: ${name}`);
});
```

### Step 6: Test Your Server

Run the server directly to verify it starts:

```bash
npx ts-node exercise_1_starter.ts
```

### Step 7: Register with Claude Code

Add your MCP server to Claude Code's configuration:

```bash
claude mcp add weather-server --command "npx ts-node exercise_1_starter.ts"
```

### Step 8: Test with Claude

Start a Claude Code session and try:

```
What's the weather in Tokyo?
```

Claude should discover and use your `get_weather` tool.

## Expected Outcomes

After completing this exercise:

1. Your MCP server starts without errors
2. Running `claude mcp list` shows your weather-server
3. Claude can successfully call your weather tool
4. You understand the request/response lifecycle

## Verification Checklist

- [ ] Server compiles without TypeScript errors
- [ ] `tools/list` returns valid tool schema
- [ ] `tools/call` executes and returns weather data
- [ ] Error handling works for invalid cities
- [ ] Claude Code recognizes and uses the tool

## Bonus Challenges

### Challenge 1: Add a Second Tool

Create a `get_forecast` tool that returns 5-day weather predictions.

### Challenge 2: Add Caching

Implement in-memory caching to avoid repeated API calls for the same city within 10
minutes.

### Challenge 3: Real API Integration

Replace the mock data with a real weather API (OpenWeatherMap, WeatherAPI, etc.).

### Challenge 4: Error Handling

Implement graceful error handling for:

- Network failures
- Invalid API responses
- Rate limiting

## Common Issues and Solutions

### Issue: "Transport not connected"

Ensure you are using stdio transport and the command path is correct.

### Issue: Tool not appearing in Claude

Run `claude mcp list` to verify registration. Check logs with `claude mcp logs
weather-server`.

### Issue: TypeScript compilation errors

Ensure `@modelcontextprotocol/sdk` is installed:

```bash
npm install @modelcontextprotocol/sdk
```

## Resources

- [MCP Specification](https://modelcontextprotocol.io/specification)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Code MCP Documentation](https://docs.anthropic.com/claude-code/mcp)
