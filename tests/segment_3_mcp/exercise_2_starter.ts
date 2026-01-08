/**
 * Exercise 2: Memory Server Extension - Starter Code
 *
 * This is a basic memory server that you will extend with:
 * 1. Namespace support
 * 2. Search functionality
 * 3. Memory expiration (TTL)
 * 4. Bulk operations
 * 5. Memory statistics
 * 6. Related memories
 *
 * Run with: npx ts-node exercise_2_starter.ts
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Types
// =============================================================================

interface Memory {
  key: string;
  value: string;
  createdAt: number;
  updatedAt: number;
  // TODO: Add these fields
  // namespace: string;
  // expiresAt?: number;
  // tags: string[];
}

interface MemoryStore {
  memories: Record<string, Memory>;
  // TODO: Add namespace support
  // namespaces: Record<string, Record<string, Memory>>;
}

// =============================================================================
// Configuration
// =============================================================================

const MEMORY_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '.',
  '.claude-code',
  'memory'
);
const MEMORY_FILE = path.join(MEMORY_DIR, 'memories.json');

// =============================================================================
// Memory Storage Functions
// =============================================================================

function ensureMemoryDir(): void {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

function loadMemories(): MemoryStore {
  ensureMemoryDir();

  if (fs.existsSync(MEMORY_FILE)) {
    const data = fs.readFileSync(MEMORY_FILE, 'utf-8');
    return JSON.parse(data);
  }

  return { memories: {} };
}

function saveMemories(store: MemoryStore): void {
  ensureMemoryDir();
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(store, null, 2));
}

// =============================================================================
// MCP Server Setup
// =============================================================================

const server = new Server(
  {
    name: 'memory-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// =============================================================================
// Tool Schemas
// =============================================================================

const storeMemorySchema = {
  name: 'store_memory',
  description: 'Store a piece of information for later recall',
  inputSchema: {
    type: 'object' as const,
    properties: {
      key: {
        type: 'string',
        description: 'Unique identifier for this memory',
      },
      value: {
        type: 'string',
        description: 'The information to store',
      },
      // TODO: Add namespace, tags, and ttl parameters
    },
    required: ['key', 'value'],
  },
};

const recallMemorySchema = {
  name: 'recall_memory',
  description: 'Retrieve a previously stored memory by key',
  inputSchema: {
    type: 'object' as const,
    properties: {
      key: {
        type: 'string',
        description: 'The key of the memory to recall',
      },
      // TODO: Add namespace parameter
    },
    required: ['key'],
  },
};

const listMemoriesSchema = {
  name: 'list_memories',
  description: 'List all stored memory keys',
  inputSchema: {
    type: 'object' as const,
    properties: {
      // TODO: Add namespace and tag filters
    },
  },
};

const deleteMemorySchema = {
  name: 'delete_memory',
  description: 'Delete a stored memory',
  inputSchema: {
    type: 'object' as const,
    properties: {
      key: {
        type: 'string',
        description: 'The key of the memory to delete',
      },
      // TODO: Add namespace parameter
    },
    required: ['key'],
  },
};

// TODO: Add schemas for:
// - search_memories
// - memory_stats
// - bulk_store
// - bulk_delete
// - find_related
// - export_memories
// - import_memories

// =============================================================================
// Tool Handlers
// =============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      storeMemorySchema,
      recallMemorySchema,
      listMemoriesSchema,
      deleteMemorySchema,
      // TODO: Add new tool schemas
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;
  const store = loadMemories();

  switch (name) {
    case 'store_memory': {
      const key = args?.key as string;
      const value = args?.value as string;

      if (!key || !value) {
        return {
          content: [{ type: 'text' as const, text: 'Error: key and value are required' }],
          isError: true,
        };
      }

      const now = Date.now();
      const isUpdate = key in store.memories;

      store.memories[key] = {
        key,
        value,
        createdAt: isUpdate ? store.memories[key].createdAt : now,
        updatedAt: now,
        // TODO: Add namespace, tags, expiresAt
      };

      saveMemories(store);

      return {
        content: [
          {
            type: 'text' as const,
            text: isUpdate ? `Updated memory: ${key}` : `Stored memory: ${key}`,
          },
        ],
      };
    }

    case 'recall_memory': {
      const key = args?.key as string;

      if (!key) {
        return {
          content: [{ type: 'text' as const, text: 'Error: key is required' }],
          isError: true,
        };
      }

      const memory = store.memories[key];

      if (!memory) {
        return {
          content: [{ type: 'text' as const, text: `Memory not found: ${key}` }],
        };
      }

      // TODO: Check if memory is expired

      return {
        content: [
          {
            type: 'text' as const,
            text: `${key}: ${memory.value}\n(stored: ${new Date(memory.createdAt).toISOString()})`,
          },
        ],
      };
    }

    case 'list_memories': {
      const keys = Object.keys(store.memories);

      if (keys.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No memories stored' }],
        };
      }

      // TODO: Filter by namespace and tags

      return {
        content: [
          {
            type: 'text' as const,
            text: `Stored memories (${keys.length}):\n${keys.map((k) => `- ${k}`).join('\n')}`,
          },
        ],
      };
    }

    case 'delete_memory': {
      const key = args?.key as string;

      if (!key) {
        return {
          content: [{ type: 'text' as const, text: 'Error: key is required' }],
          isError: true,
        };
      }

      if (!(key in store.memories)) {
        return {
          content: [{ type: 'text' as const, text: `Memory not found: ${key}` }],
        };
      }

      delete store.memories[key];
      saveMemories(store);

      return {
        content: [{ type: 'text' as const, text: `Deleted memory: ${key}` }],
      };
    }

    // TODO: Implement handlers for:
    // - search_memories
    // - memory_stats
    // - bulk_store
    // - bulk_delete
    // - find_related
    // - export_memories
    // - import_memories

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// =============================================================================
// TODO: Implement helper functions
// =============================================================================

// Search memories by keyword
function searchMemories(
  store: MemoryStore,
  query: string,
  options?: {
    namespace?: string;
    tags?: string[];
  }
): Memory[] {
  // TODO: Implement search logic
  return [];
}

// Get memory statistics
function getMemoryStats(store: MemoryStore): {
  totalMemories: number;
  // TODO: Add more stats
} {
  return {
    totalMemories: Object.keys(store.memories).length,
  };
}

// Find related memories
function findRelatedMemories(store: MemoryStore, key: string): Memory[] {
  // TODO: Implement related memories algorithm
  return [];
}

// Clean up expired memories
function cleanupExpiredMemories(store: MemoryStore): number {
  // TODO: Implement expiration cleanup
  return 0;
}

// =============================================================================
// Start the server
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Memory MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
