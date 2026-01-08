/**
 * Exercise 1: Build a Custom MCP Tool - Starter Code
 *
 * This is a skeleton MCP server. Your task is to:
 * 1. Define the get_weather tool schema
 * 2. Implement the tools/list handler
 * 3. Implement the tools/call handler
 * 4. Add proper error handling
 *
 * Run with: npx ts-node exercise_1_starter.ts
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
} from '@modelcontextprotocol/sdk/types.js';

// Create the MCP server instance
const server = new Server(
  {
    name: 'weather-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// =============================================================================
// TODO: Define your weather tool schema
// =============================================================================

// Hint: Create an object with name, description, and inputSchema
// The inputSchema should define 'city' (required) and 'units' (optional)

const weatherToolSchema = {
  // Your schema here
};

// =============================================================================
// TODO: Implement the tools/list handler
// =============================================================================

// This handler tells Claude what tools are available
// Return an object with a 'tools' array containing your tool schemas

server.setRequestHandler(ListToolsRequestSchema, async (_request: ListToolsRequest) => {
  // TODO: Return the list of available tools
  return {
    tools: [],
  };
});

// =============================================================================
// TODO: Implement the tools/call handler
// =============================================================================

// This handler executes tool calls from Claude
// Parse the arguments, perform the action, return the result

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;

  // TODO: Handle the 'get_weather' tool
  // 1. Extract city and units from args
  // 2. Generate or fetch weather data
  // 3. Return formatted response

  if (name === 'get_weather') {
    // Your implementation here

    // Hint: Return format should be:
    // {
    //   content: [
    //     {
    //       type: 'text',
    //       text: 'Weather data here...'
    //     }
    //   ]
    // }

    throw new Error('Not implemented yet');
  }

  throw new Error(`Unknown tool: ${name}`);
});

// =============================================================================
// Helper function to generate mock weather data
// =============================================================================

interface WeatherData {
  city: string;
  temperature: number;
  units: string;
  conditions: string;
  humidity: number;
  windSpeed: number;
}

function getMockWeatherData(city: string, units: string = 'celsius'): WeatherData {
  // Generate deterministic but varied data based on city name
  const hash = city.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Overcast'];
  const conditionIndex = hash % conditions.length;

  let temperature = 15 + (hash % 20);
  if (units === 'fahrenheit') {
    temperature = Math.round((temperature * 9) / 5 + 32);
  }

  return {
    city,
    temperature,
    units,
    conditions: conditions[conditionIndex],
    humidity: 40 + (hash % 40),
    windSpeed: 5 + (hash % 25),
  };
}

// =============================================================================
// Start the server
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Weather MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
