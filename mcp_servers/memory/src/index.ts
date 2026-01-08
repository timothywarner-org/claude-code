#!/usr/bin/env node
/**
 * Project Memory MCP Server
 *
 * A production-ready MCP server that provides persistent memory for Claude Code.
 * Stores architectural decisions, coding conventions, project notes, and context.
 *
 * Usage:
 *   npx tsx src/index.ts
 *   node dist/index.js (after build)
 *
 * Configure in Claude Code:
 *   claude mcp add memory -- npx tsx /path/to/memory/src/index.ts
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

// Memory storage types
interface Decision {
  id: string;
  title: string;
  description: string;
  rationale: string;
  date: string;
  tags: string[];
  status: 'active' | 'superseded' | 'deprecated';
  supersededBy?: string;
}

interface Convention {
  id: string;
  category: string;
  rule: string;
  examples: string[];
  enforced: boolean;
}

interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
  tags: string[];
}

interface Context {
  key: string;
  value: string;
  description: string;
  lastUpdated: string;
}

interface MemoryStore {
  projectName: string;
  decisions: Decision[];
  conventions: Convention[];
  notes: Note[];
  context: Context[];
  lastModified: string;
}

// Default storage location
const MEMORY_DIR = process.env.MEMORY_DIR || join(homedir(), '.claude-memory');
const MEMORY_FILE = process.env.MEMORY_FILE || join(MEMORY_DIR, 'memory.json');

// Ensure storage directory exists
function ensureStorageDir(): void {
  const dir = dirname(MEMORY_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Load memory from disk
function loadMemory(): MemoryStore {
  ensureStorageDir();

  if (existsSync(MEMORY_FILE)) {
    const data = readFileSync(MEMORY_FILE, 'utf-8');
    return JSON.parse(data) as MemoryStore;
  }

  return {
    projectName: 'default',
    decisions: [],
    conventions: [],
    notes: [],
    context: [],
    lastModified: new Date().toISOString(),
  };
}

// Save memory to disk
function saveMemory(memory: MemoryStore): void {
  ensureStorageDir();
  memory.lastModified = new Date().toISOString();
  writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Initialize server
const server = new McpServer({
  name: 'project-memory',
  version: '1.0.0',
});

// =============================================================================
// TOOLS - Actions that modify memory
// =============================================================================

// Store a decision
server.tool(
  'store_decision',
  'Store an architectural or technical decision with rationale',
  {
    title: z.string().describe('Brief title for the decision'),
    description: z.string().describe('Detailed description of the decision'),
    rationale: z.string().describe('Why this decision was made'),
    tags: z.array(z.string()).optional().describe('Tags for categorization'),
  },
  async ({ title, description, rationale, tags }) => {
    const memory = loadMemory();

    const decision: Decision = {
      id: generateId(),
      title,
      description,
      rationale,
      date: new Date().toISOString(),
      tags: tags || [],
      status: 'active',
    };

    memory.decisions.push(decision);
    saveMemory(memory);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Decision stored: "${title}" (ID: ${decision.id})`,
        },
      ],
    };
  }
);

// Store a convention
server.tool(
  'store_convention',
  'Store a coding convention or standard',
  {
    category: z
      .string()
      .describe('Category (e.g., naming, formatting, architecture)'),
    rule: z.string().describe('The convention rule'),
    examples: z
      .array(z.string())
      .optional()
      .describe('Example code snippets'),
    enforced: z
      .boolean()
      .optional()
      .describe('Whether this is strictly enforced'),
  },
  async ({ category, rule, examples, enforced }) => {
    const memory = loadMemory();

    const convention: Convention = {
      id: generateId(),
      category,
      rule,
      examples: examples || [],
      enforced: enforced ?? true,
    };

    memory.conventions.push(convention);
    saveMemory(memory);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Convention stored in category "${category}" (ID: ${convention.id})`,
        },
      ],
    };
  }
);

// Store a note
server.tool(
  'store_note',
  'Store a general project note or documentation',
  {
    title: z.string().describe('Note title'),
    content: z.string().describe('Note content (supports markdown)'),
    tags: z.array(z.string()).optional().describe('Tags for categorization'),
  },
  async ({ title, content, tags }) => {
    const memory = loadMemory();

    const note: Note = {
      id: generateId(),
      title,
      content,
      date: new Date().toISOString(),
      tags: tags || [],
    };

    memory.notes.push(note);
    saveMemory(memory);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Note stored: "${title}" (ID: ${note.id})`,
        },
      ],
    };
  }
);

// Store context
server.tool(
  'store_context',
  'Store key-value context information',
  {
    key: z.string().describe('Context key (e.g., "database_type")'),
    value: z.string().describe('Context value'),
    description: z.string().optional().describe('Description of this context'),
  },
  async ({ key, value, description }) => {
    const memory = loadMemory();

    // Update existing or add new
    const existingIndex = memory.context.findIndex((c) => c.key === key);

    const contextEntry: Context = {
      key,
      value,
      description: description || '',
      lastUpdated: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      memory.context[existingIndex] = contextEntry;
    } else {
      memory.context.push(contextEntry);
    }

    saveMemory(memory);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Context "${key}" set to "${value}"`,
        },
      ],
    };
  }
);

// Search memory
server.tool(
  'search_memory',
  'Search across all memory types',
  {
    query: z.string().describe('Search query'),
    type: z
      .enum(['all', 'decisions', 'conventions', 'notes', 'context'])
      .optional()
      .describe('Type of memory to search'),
  },
  async ({ query, type }) => {
    const memory = loadMemory();
    const queryLower = query.toLowerCase();
    const results: string[] = [];

    const searchType = type || 'all';

    if (searchType === 'all' || searchType === 'decisions') {
      for (const d of memory.decisions) {
        if (
          d.title.toLowerCase().includes(queryLower) ||
          d.description.toLowerCase().includes(queryLower) ||
          d.tags.some((t) => t.toLowerCase().includes(queryLower))
        ) {
          results.push(
            `[Decision] ${d.title}: ${d.description.substring(0, 100)}...`
          );
        }
      }
    }

    if (searchType === 'all' || searchType === 'conventions') {
      for (const c of memory.conventions) {
        if (
          c.category.toLowerCase().includes(queryLower) ||
          c.rule.toLowerCase().includes(queryLower)
        ) {
          results.push(`[Convention] ${c.category}: ${c.rule}`);
        }
      }
    }

    if (searchType === 'all' || searchType === 'notes') {
      for (const n of memory.notes) {
        if (
          n.title.toLowerCase().includes(queryLower) ||
          n.content.toLowerCase().includes(queryLower)
        ) {
          results.push(
            `[Note] ${n.title}: ${n.content.substring(0, 100)}...`
          );
        }
      }
    }

    if (searchType === 'all' || searchType === 'context') {
      for (const ctx of memory.context) {
        if (
          ctx.key.toLowerCase().includes(queryLower) ||
          ctx.value.toLowerCase().includes(queryLower)
        ) {
          results.push(`[Context] ${ctx.key}: ${ctx.value}`);
        }
      }
    }

    return {
      content: [
        {
          type: 'text' as const,
          text:
            results.length > 0
              ? `Found ${results.length} results:\n\n${results.join('\n')}`
              : 'No results found',
        },
      ],
    };
  }
);

// Delete from memory
server.tool(
  'delete_memory',
  'Delete an item from memory by ID',
  {
    id: z.string().describe('ID of the item to delete'),
    type: z
      .enum(['decision', 'convention', 'note', 'context'])
      .describe('Type of memory item'),
  },
  async ({ id, type }) => {
    const memory = loadMemory();
    let deleted = false;

    switch (type) {
      case 'decision':
        const dIdx = memory.decisions.findIndex((d) => d.id === id);
        if (dIdx >= 0) {
          memory.decisions.splice(dIdx, 1);
          deleted = true;
        }
        break;
      case 'convention':
        const cIdx = memory.conventions.findIndex((c) => c.id === id);
        if (cIdx >= 0) {
          memory.conventions.splice(cIdx, 1);
          deleted = true;
        }
        break;
      case 'note':
        const nIdx = memory.notes.findIndex((n) => n.id === id);
        if (nIdx >= 0) {
          memory.notes.splice(nIdx, 1);
          deleted = true;
        }
        break;
      case 'context':
        const ctxIdx = memory.context.findIndex((c) => c.key === id);
        if (ctxIdx >= 0) {
          memory.context.splice(ctxIdx, 1);
          deleted = true;
        }
        break;
    }

    if (deleted) {
      saveMemory(memory);
      return {
        content: [{ type: 'text' as const, text: `Deleted ${type}: ${id}` }],
      };
    }

    return {
      content: [
        { type: 'text' as const, text: `Item not found: ${type} ${id}` },
      ],
    };
  }
);

// =============================================================================
// RESOURCES - Read-only access to memory
// =============================================================================

// All decisions resource
server.resource('decisions', 'memory://decisions', async () => {
  const memory = loadMemory();
  return {
    contents: [
      {
        uri: 'memory://decisions',
        mimeType: 'application/json',
        text: JSON.stringify(memory.decisions, null, 2),
      },
    ],
  };
});

// All conventions resource
server.resource('conventions', 'memory://conventions', async () => {
  const memory = loadMemory();
  return {
    contents: [
      {
        uri: 'memory://conventions',
        mimeType: 'application/json',
        text: JSON.stringify(memory.conventions, null, 2),
      },
    ],
  };
});

// All notes resource
server.resource('notes', 'memory://notes', async () => {
  const memory = loadMemory();
  return {
    contents: [
      {
        uri: 'memory://notes',
        mimeType: 'application/json',
        text: JSON.stringify(memory.notes, null, 2),
      },
    ],
  };
});

// All context resource
server.resource('context', 'memory://context', async () => {
  const memory = loadMemory();
  return {
    contents: [
      {
        uri: 'memory://context',
        mimeType: 'application/json',
        text: JSON.stringify(memory.context, null, 2),
      },
    ],
  };
});

// Full memory summary resource
server.resource('summary', 'memory://summary', async () => {
  const memory = loadMemory();

  const summary = `# Project Memory Summary

**Project:** ${memory.projectName}
**Last Modified:** ${memory.lastModified}

## Statistics
- Decisions: ${memory.decisions.length}
- Conventions: ${memory.conventions.length}
- Notes: ${memory.notes.length}
- Context Items: ${memory.context.length}

## Recent Decisions
${memory.decisions
  .slice(-5)
  .map((d) => `- **${d.title}** (${d.status}): ${d.description.substring(0, 80)}...`)
  .join('\n')}

## Active Conventions
${memory.conventions
  .filter((c) => c.enforced)
  .slice(0, 10)
  .map((c) => `- **${c.category}**: ${c.rule}`)
  .join('\n')}

## Current Context
${memory.context.map((c) => `- **${c.key}**: ${c.value}`).join('\n')}
`;

  return {
    contents: [
      {
        uri: 'memory://summary',
        mimeType: 'text/markdown',
        text: summary,
      },
    ],
  };
});

// =============================================================================
// PROMPTS - Pre-built prompts for common tasks
// =============================================================================

server.prompt(
  'review_decisions',
  'Review all architectural decisions and suggest updates',
  async () => {
    const memory = loadMemory();

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please review these architectural decisions and suggest any that might be outdated or need reconsideration:

${JSON.stringify(memory.decisions, null, 2)}

For each decision, consider:
1. Is this still relevant?
2. Has the context changed?
3. Should it be superseded by a newer decision?`,
          },
        },
      ],
    };
  }
);

server.prompt(
  'generate_onboarding',
  'Generate onboarding documentation from memory',
  async () => {
    const memory = loadMemory();

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Based on this project memory, generate a comprehensive onboarding document for new developers:

**Decisions:**
${JSON.stringify(memory.decisions, null, 2)}

**Conventions:**
${JSON.stringify(memory.conventions, null, 2)}

**Context:**
${JSON.stringify(memory.context, null, 2)}

Create a well-organized onboarding guide that covers:
1. Project overview and architecture
2. Key decisions and their rationale
3. Coding conventions to follow
4. Important context and configuration`,
          },
        },
      ],
    };
  }
);

// =============================================================================
// START SERVER
// =============================================================================

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Project Memory MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
