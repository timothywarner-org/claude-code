/**
 * Exercise 1: Build a Custom MCP Tool - Solution
 *
 * This is the complete working implementation of the weather MCP server.
 * Compare your solution against this to verify your implementation.
 *
 * Run with: npx ts-node exercise_1_solution.ts
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
// Weather tool schema definition
// =============================================================================

const weatherToolSchema = {
  name: 'get_weather',
  description:
    'Get current weather conditions for a specified city. Returns temperature, conditions, humidity, and wind speed.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      city: {
        type: 'string',
        description: 'City name (e.g., "San Francisco", "Tokyo", "London")',
      },
      units: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius',
        description: 'Temperature units (celsius or fahrenheit)',
      },
    },
    required: ['city'],
  },
};

// Bonus: Forecast tool schema
const forecastToolSchema = {
  name: 'get_forecast',
  description:
    'Get 5-day weather forecast for a specified city. Returns daily predictions with high/low temperatures.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      city: {
        type: 'string',
        description: 'City name',
      },
      units: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius',
      },
    },
    required: ['city'],
  },
};

// =============================================================================
// Tools list handler
// =============================================================================

server.setRequestHandler(ListToolsRequestSchema, async (_request: ListToolsRequest) => {
  return {
    tools: [weatherToolSchema, forecastToolSchema],
  };
});

// =============================================================================
// Tools call handler
// =============================================================================

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_weather') {
    // Validate required arguments
    if (!args || typeof args.city !== 'string') {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Error: City name is required',
          },
        ],
        isError: true,
      };
    }

    const city = args.city;
    const units = (args.units as string) || 'celsius';

    // Get weather data
    const weather = getMockWeatherData(city, units);

    // Format response
    const unitSymbol = units === 'celsius' ? 'C' : 'F';
    const response = `Current weather in ${weather.city}:
- Temperature: ${weather.temperature}${unitSymbol}
- Conditions: ${weather.conditions}
- Humidity: ${weather.humidity}%
- Wind Speed: ${weather.windSpeed} km/h`;

    return {
      content: [
        {
          type: 'text' as const,
          text: response,
        },
      ],
    };
  }

  if (name === 'get_forecast') {
    if (!args || typeof args.city !== 'string') {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Error: City name is required',
          },
        ],
        isError: true,
      };
    }

    const city = args.city;
    const units = (args.units as string) || 'celsius';

    const forecast = getMockForecast(city, units);
    const unitSymbol = units === 'celsius' ? 'C' : 'F';

    const forecastLines = forecast
      .map((day) => `${day.date}: ${day.conditions}, High: ${day.high}${unitSymbol}, Low: ${day.low}${unitSymbol}`)
      .join('\n');

    const response = `5-Day Forecast for ${city}:\n${forecastLines}`;

    return {
      content: [
        {
          type: 'text' as const,
          text: response,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// =============================================================================
// Helper functions
// =============================================================================

interface WeatherData {
  city: string;
  temperature: number;
  units: string;
  conditions: string;
  humidity: number;
  windSpeed: number;
}

interface ForecastDay {
  date: string;
  high: number;
  low: number;
  conditions: string;
}

function getMockWeatherData(city: string, units: string = 'celsius'): WeatherData {
  const hash = city
    .toLowerCase()
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

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

function getMockForecast(city: string, units: string = 'celsius'): ForecastDay[] {
  const hash = city
    .toLowerCase()
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Overcast'];
  const forecast: ForecastDay[] = [];

  const today = new Date();

  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    let high = 18 + ((hash + i * 7) % 15);
    let low = high - 5 - (i % 3);

    if (units === 'fahrenheit') {
      high = Math.round((high * 9) / 5 + 32);
      low = Math.round((low * 9) / 5 + 32);
    }

    forecast.push({
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      high,
      low,
      conditions: conditions[(hash + i) % conditions.length],
    });
  }

  return forecast;
}

// =============================================================================
// Bonus: Simple in-memory cache
// =============================================================================

interface CacheEntry {
  data: WeatherData;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCachedWeather(city: string, units: string): WeatherData | null {
  const key = `${city.toLowerCase()}-${units}`;
  const entry = cache.get(key);

  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }

  return null;
}

function setCachedWeather(city: string, units: string, data: WeatherData): void {
  const key = `${city.toLowerCase()}-${units}`;
  cache.set(key, { data, timestamp: Date.now() });
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
