/**
 * Exercise 2: Memory Server Extension - Solution
 *
 * Complete implementation with:
 * - Namespace support
 * - Search functionality
 * - Memory expiration (TTL)
 * - Bulk operations
 * - Memory statistics
 * - Related memories
 *
 * Run with: npx ts-node exercise_2_solution.ts
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
  namespace: string;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  tags: string[];
}

interface MemoryStore {
  version: number;
  memories: Record<string, Memory>;
}

interface MemoryStats {
  totalMemories: number;
  byNamespace: Record<string, number>;
  byTag: Record<string, number>;
  oldestMemory: string | null;
  newestMemory: string | null;
  expiringWithin24h: number;
  totalSizeBytes: number;
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
const DEFAULT_NAMESPACE = 'default';

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
    const store = JSON.parse(data) as MemoryStore;
    // Auto-cleanup expired memories on load
    cleanupExpiredMemories(store);
    return store;
  }

  return { version: 1, memories: {} };
}

function saveMemories(store: MemoryStore): void {
  ensureMemoryDir();
  // Atomic write using temp file
  const tempFile = `${MEMORY_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(store, null, 2));
  fs.renameSync(tempFile, MEMORY_FILE);
}

function getMemoryKey(key: string, namespace: string): string {
  return `${namespace}:${key}`;
}

// =============================================================================
// MCP Server Setup
// =============================================================================

const server = new Server(
  {
    name: 'memory-server',
    version: '2.0.0',
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

const toolSchemas = [
  {
    name: 'store_memory',
    description: 'Store a piece of information for later recall',
    inputSchema: {
      type: 'object' as const,
      properties: {
        key: { type: 'string', description: 'Unique identifier for this memory' },
        value: { type: 'string', description: 'The information to store' },
        namespace: {
          type: 'string',
          description: 'Namespace to organize memories (default: "default")',
          default: 'default',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization and search',
        },
        ttl: {
          type: 'number',
          description: 'Time to live in seconds (optional)',
        },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'recall_memory',
    description: 'Retrieve a previously stored memory by key',
    inputSchema: {
      type: 'object' as const,
      properties: {
        key: { type: 'string', description: 'The key of the memory to recall' },
        namespace: { type: 'string', default: 'default' },
      },
      required: ['key'],
    },
  },
  {
    name: 'search_memories',
    description: 'Search memories by keyword, tags, or namespace',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query (searches keys and values)' },
        namespace: { type: 'string', description: 'Filter by namespace' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags (AND logic)',
        },
        limit: { type: 'number', default: 10 },
        sortBy: {
          type: 'string',
          enum: ['recency', 'relevance'],
          default: 'relevance',
        },
      },
    },
  },
  {
    name: 'list_memories',
    description: 'List all stored memory keys',
    inputSchema: {
      type: 'object' as const,
      properties: {
        namespace: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'delete_memory',
    description: 'Delete a stored memory',
    inputSchema: {
      type: 'object' as const,
      properties: {
        key: { type: 'string' },
        namespace: { type: 'string', default: 'default' },
      },
      required: ['key'],
    },
  },
  {
    name: 'memory_stats',
    description: 'Get statistics about stored memories',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'bulk_store',
    description: 'Store multiple memories at once',
    inputSchema: {
      type: 'object' as const,
      properties: {
        memories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              value: { type: 'string' },
              namespace: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
            },
            required: ['key', 'value'],
          },
        },
      },
      required: ['memories'],
    },
  },
  {
    name: 'bulk_delete',
    description: 'Delete memories by namespace or pattern',
    inputSchema: {
      type: 'object' as const,
      properties: {
        namespace: { type: 'string', description: 'Delete all memories in namespace' },
        pattern: { type: 'string', description: 'Delete keys matching pattern (glob)' },
      },
    },
  },
  {
    name: 'find_related',
    description: 'Find memories related to a given key',
    inputSchema: {
      type: 'object' as const,
      properties: {
        key: { type: 'string' },
        namespace: { type: 'string', default: 'default' },
        limit: { type: 'number', default: 5 },
      },
      required: ['key'],
    },
  },
  {
    name: 'export_memories',
    description: 'Export all memories as JSON',
    inputSchema: {
      type: 'object' as const,
      properties: {
        namespace: { type: 'string', description: 'Export only this namespace' },
      },
    },
  },
  {
    name: 'import_memories',
    description: 'Import memories from JSON',
    inputSchema: {
      type: 'object' as const,
      properties: {
        data: { type: 'string', description: 'JSON string of memories to import' },
        overwrite: { type: 'boolean', default: false },
      },
      required: ['data'],
    },
  },
];

// =============================================================================
// Tool Handlers
// =============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: toolSchemas };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;
  const store = loadMemories();

  try {
    switch (name) {
      case 'store_memory': {
        const key = args?.key as string;
        const value = args?.value as string;
        const namespace = (args?.namespace as string) || DEFAULT_NAMESPACE;
        const tags = (args?.tags as string[]) || [];
        const ttl = args?.ttl as number | undefined;

        if (!key || !value) {
          return errorResponse('key and value are required');
        }

        const fullKey = getMemoryKey(key, namespace);
        const now = Date.now();
        const isUpdate = fullKey in store.memories;

        store.memories[fullKey] = {
          key,
          value,
          namespace,
          createdAt: isUpdate ? store.memories[fullKey].createdAt : now,
          updatedAt: now,
          expiresAt: ttl ? now + ttl * 1000 : undefined,
          tags,
        };

        saveMemories(store);
        return textResponse(isUpdate ? `Updated memory: ${key} in ${namespace}` : `Stored memory: ${key} in ${namespace}`);
      }

      case 'recall_memory': {
        const key = args?.key as string;
        const namespace = (args?.namespace as string) || DEFAULT_NAMESPACE;

        if (!key) return errorResponse('key is required');

        const fullKey = getMemoryKey(key, namespace);
        const memory = store.memories[fullKey];

        if (!memory) {
          return textResponse(`Memory not found: ${key} in ${namespace}`);
        }

        if (memory.expiresAt && memory.expiresAt < Date.now()) {
          delete store.memories[fullKey];
          saveMemories(store);
          return textResponse(`Memory expired: ${key}`);
        }

        const expiresInfo = memory.expiresAt
          ? `\n(expires: ${new Date(memory.expiresAt).toISOString()})`
          : '';
        const tagsInfo = memory.tags.length ? `\n(tags: ${memory.tags.join(', ')})` : '';

        return textResponse(
          `${key}: ${memory.value}\n(namespace: ${namespace}, stored: ${new Date(memory.createdAt).toISOString()})${tagsInfo}${expiresInfo}`
        );
      }

      case 'search_memories': {
        const query = (args?.query as string) || '';
        const namespace = args?.namespace as string | undefined;
        const tags = (args?.tags as string[]) || [];
        const limit = (args?.limit as number) || 10;
        const sortBy = (args?.sortBy as string) || 'relevance';

        const results = searchMemories(store, query, { namespace, tags, limit, sortBy });

        if (results.length === 0) {
          return textResponse('No memories found matching your search');
        }

        const formatted = results
          .map((m, i) => {
            const preview = m.value.length > 100 ? m.value.slice(0, 100) + '...' : m.value;
            return `${i + 1}. [${m.namespace}] ${m.key}: ${preview}`;
          })
          .join('\n');

        return textResponse(`Found ${results.length} memories:\n${formatted}`);
      }

      case 'list_memories': {
        const namespace = args?.namespace as string | undefined;
        const tags = (args?.tags as string[]) || [];

        let memories = Object.values(store.memories);

        if (namespace) {
          memories = memories.filter((m) => m.namespace === namespace);
        }

        if (tags.length > 0) {
          memories = memories.filter((m) => tags.every((t) => m.tags.includes(t)));
        }

        // Remove expired
        memories = memories.filter((m) => !m.expiresAt || m.expiresAt > Date.now());

        if (memories.length === 0) {
          return textResponse('No memories found');
        }

        const byNamespace: Record<string, string[]> = {};
        for (const m of memories) {
          if (!byNamespace[m.namespace]) byNamespace[m.namespace] = [];
          byNamespace[m.namespace].push(m.key);
        }

        const formatted = Object.entries(byNamespace)
          .map(([ns, keys]) => `[${ns}]\n${keys.map((k) => `  - ${k}`).join('\n')}`)
          .join('\n\n');

        return textResponse(`Stored memories (${memories.length}):\n${formatted}`);
      }

      case 'delete_memory': {
        const key = args?.key as string;
        const namespace = (args?.namespace as string) || DEFAULT_NAMESPACE;

        if (!key) return errorResponse('key is required');

        const fullKey = getMemoryKey(key, namespace);

        if (!(fullKey in store.memories)) {
          return textResponse(`Memory not found: ${key} in ${namespace}`);
        }

        delete store.memories[fullKey];
        saveMemories(store);
        return textResponse(`Deleted memory: ${key} from ${namespace}`);
      }

      case 'memory_stats': {
        const stats = getMemoryStats(store);
        const nsStats = Object.entries(stats.byNamespace)
          .map(([ns, count]) => `  ${ns}: ${count}`)
          .join('\n');
        const tagStats = Object.entries(stats.byTag)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag, count]) => `  ${tag}: ${count}`)
          .join('\n');

        return textResponse(`Memory Statistics:
Total memories: ${stats.totalMemories}
Total size: ${(stats.totalSizeBytes / 1024).toFixed(2)} KB
Oldest: ${stats.oldestMemory || 'N/A'}
Newest: ${stats.newestMemory || 'N/A'}
Expiring within 24h: ${stats.expiringWithin24h}

By Namespace:
${nsStats || '  (none)'}

Top Tags:
${tagStats || '  (none)'}`);
      }

      case 'bulk_store': {
        const memories = args?.memories as Array<{
          key: string;
          value: string;
          namespace?: string;
          tags?: string[];
        }>;

        if (!memories || !Array.isArray(memories)) {
          return errorResponse('memories array is required');
        }

        const now = Date.now();
        let stored = 0;

        for (const m of memories) {
          const namespace = m.namespace || DEFAULT_NAMESPACE;
          const fullKey = getMemoryKey(m.key, namespace);

          store.memories[fullKey] = {
            key: m.key,
            value: m.value,
            namespace,
            createdAt: now,
            updatedAt: now,
            tags: m.tags || [],
          };
          stored++;
        }

        saveMemories(store);
        return textResponse(`Stored ${stored} memories`);
      }

      case 'bulk_delete': {
        const namespace = args?.namespace as string | undefined;
        const pattern = args?.pattern as string | undefined;

        if (!namespace && !pattern) {
          return errorResponse('namespace or pattern is required');
        }

        let deleted = 0;
        const keysToDelete: string[] = [];

        for (const [fullKey, memory] of Object.entries(store.memories)) {
          if (namespace && memory.namespace === namespace) {
            keysToDelete.push(fullKey);
          } else if (pattern) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            if (regex.test(memory.key)) {
              keysToDelete.push(fullKey);
            }
          }
        }

        for (const key of keysToDelete) {
          delete store.memories[key];
          deleted++;
        }

        saveMemories(store);
        return textResponse(`Deleted ${deleted} memories`);
      }

      case 'find_related': {
        const key = args?.key as string;
        const namespace = (args?.namespace as string) || DEFAULT_NAMESPACE;
        const limit = (args?.limit as number) || 5;

        if (!key) return errorResponse('key is required');

        const fullKey = getMemoryKey(key, namespace);
        const memory = store.memories[fullKey];

        if (!memory) {
          return textResponse(`Memory not found: ${key} in ${namespace}`);
        }

        const related = findRelatedMemories(store, memory, limit);

        if (related.length === 0) {
          return textResponse('No related memories found');
        }

        const formatted = related
          .map((r, i) => {
            const preview = r.value.length > 80 ? r.value.slice(0, 80) + '...' : r.value;
            return `${i + 1}. [${r.namespace}] ${r.key}: ${preview}`;
          })
          .join('\n');

        return textResponse(`Related memories:\n${formatted}`);
      }

      case 'export_memories': {
        const namespace = args?.namespace as string | undefined;

        let memories = Object.values(store.memories);
        if (namespace) {
          memories = memories.filter((m) => m.namespace === namespace);
        }

        const exportData = JSON.stringify(memories, null, 2);
        return textResponse(`Exported ${memories.length} memories:\n${exportData}`);
      }

      case 'import_memories': {
        const data = args?.data as string;
        const overwrite = (args?.overwrite as boolean) || false;

        if (!data) return errorResponse('data is required');

        let memories: Memory[];
        try {
          memories = JSON.parse(data);
        } catch {
          return errorResponse('Invalid JSON data');
        }

        if (!Array.isArray(memories)) {
          return errorResponse('Data must be an array of memories');
        }

        let imported = 0;
        let skipped = 0;

        for (const m of memories) {
          const fullKey = getMemoryKey(m.key, m.namespace || DEFAULT_NAMESPACE);

          if (fullKey in store.memories && !overwrite) {
            skipped++;
            continue;
          }

          store.memories[fullKey] = {
            ...m,
            namespace: m.namespace || DEFAULT_NAMESPACE,
            tags: m.tags || [],
          };
          imported++;
        }

        saveMemories(store);
        return textResponse(`Imported ${imported} memories (${skipped} skipped)`);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(message);
  }
});

// =============================================================================
// Helper Functions
// =============================================================================

function textResponse(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function errorResponse(text: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${text}` }], isError: true };
}

function searchMemories(
  store: MemoryStore,
  query: string,
  options: {
    namespace?: string;
    tags?: string[];
    limit?: number;
    sortBy?: string;
  }
): Memory[] {
  let memories = Object.values(store.memories);

  // Remove expired
  memories = memories.filter((m) => !m.expiresAt || m.expiresAt > Date.now());

  // Filter by namespace
  if (options.namespace) {
    memories = memories.filter((m) => m.namespace === options.namespace);
  }

  // Filter by tags
  if (options.tags && options.tags.length > 0) {
    memories = memories.filter((m) => options.tags!.every((t) => m.tags.includes(t)));
  }

  // Search query
  if (query) {
    const lowerQuery = query.toLowerCase();
    memories = memories.filter(
      (m) => m.key.toLowerCase().includes(lowerQuery) || m.value.toLowerCase().includes(lowerQuery)
    );

    // Score by relevance (simple: exact match > partial match)
    if (options.sortBy === 'relevance') {
      memories.sort((a, b) => {
        const aKeyMatch = a.key.toLowerCase() === lowerQuery ? 2 : a.key.toLowerCase().includes(lowerQuery) ? 1 : 0;
        const bKeyMatch = b.key.toLowerCase() === lowerQuery ? 2 : b.key.toLowerCase().includes(lowerQuery) ? 1 : 0;
        return bKeyMatch - aKeyMatch;
      });
    }
  }

  // Sort by recency if specified
  if (options.sortBy === 'recency') {
    memories.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  return memories.slice(0, options.limit || 10);
}

function getMemoryStats(store: MemoryStore): MemoryStats {
  const memories = Object.values(store.memories);
  const now = Date.now();
  const in24h = now + 24 * 60 * 60 * 1000;

  const byNamespace: Record<string, number> = {};
  const byTag: Record<string, number> = {};
  let oldest: Memory | null = null;
  let newest: Memory | null = null;
  let expiringWithin24h = 0;

  for (const m of memories) {
    // Namespace stats
    byNamespace[m.namespace] = (byNamespace[m.namespace] || 0) + 1;

    // Tag stats
    for (const tag of m.tags) {
      byTag[tag] = (byTag[tag] || 0) + 1;
    }

    // Oldest/newest
    if (!oldest || m.createdAt < oldest.createdAt) oldest = m;
    if (!newest || m.createdAt > newest.createdAt) newest = m;

    // Expiring soon
    if (m.expiresAt && m.expiresAt <= in24h && m.expiresAt > now) {
      expiringWithin24h++;
    }
  }

  const totalSizeBytes = Buffer.byteLength(JSON.stringify(store), 'utf8');

  return {
    totalMemories: memories.length,
    byNamespace,
    byTag,
    oldestMemory: oldest ? new Date(oldest.createdAt).toISOString() : null,
    newestMemory: newest ? new Date(newest.createdAt).toISOString() : null,
    expiringWithin24h,
    totalSizeBytes,
  };
}

function findRelatedMemories(store: MemoryStore, source: Memory, limit: number): Memory[] {
  const memories = Object.values(store.memories).filter(
    (m) => getMemoryKey(m.key, m.namespace) !== getMemoryKey(source.key, source.namespace)
  );

  // Score memories by relatedness
  const scored = memories.map((m) => {
    let score = 0;

    // Same namespace
    if (m.namespace === source.namespace) score += 2;

    // Shared tags
    const sharedTags = m.tags.filter((t) => source.tags.includes(t));
    score += sharedTags.length * 3;

    // Similar key (common words)
    const sourceWords = source.key.toLowerCase().split(/[\s_-]+/);
    const targetWords = m.key.toLowerCase().split(/[\s_-]+/);
    const commonWords = sourceWords.filter((w) => targetWords.includes(w));
    score += commonWords.length * 2;

    // Temporal proximity (created within 1 hour)
    const timeDiff = Math.abs(m.createdAt - source.createdAt);
    if (timeDiff < 60 * 60 * 1000) score += 1;

    return { memory: m, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.memory);
}

function cleanupExpiredMemories(store: MemoryStore): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, memory] of Object.entries(store.memories)) {
    if (memory.expiresAt && memory.expiresAt < now) {
      delete store.memories[key];
      cleaned++;
    }
  }

  if (cleaned > 0) {
    saveMemories(store);
  }

  return cleaned;
}

// =============================================================================
// Start the server
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Memory MCP server v2.0 running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
