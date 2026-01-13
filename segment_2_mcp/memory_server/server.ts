/**
 * Segment 3: JSON Memory Server
 *
 * A complete MCP server that provides persistent memory for Claude.
 * Stores project context, decisions, conventions, and notes in JSON.
 *
 * Run standalone: npx tsx segment_3_mcp/02_json_memory_server/server.ts
 * Configure in Claude: claude mcp add memory -- npx tsx ./segment_3_mcp/02_json_memory_server/server.ts
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

// Memory storage path
const MEMORY_PATH = process.env.MCP_MEMORY_PATH || './data/memory.json';

// Memory structure
interface Memory {
  decisions: Decision[];
  conventions: Convention[];
  notes: Note[];
  context: Record<string, string>;
  lastUpdated: string;
}

interface Decision {
  id: string;
  title: string;
  description: string;
  rationale: string;
  date: string;
  tags: string[];
}

interface Convention {
  id: string;
  name: string;
  description: string;
  examples: string[];
  category: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
  tags: string[];
}

/**
 * Load memory from disk
 */
function loadMemory(): Memory {
  if (existsSync(MEMORY_PATH)) {
    const data = readFileSync(MEMORY_PATH, 'utf-8');
    return JSON.parse(data) as Memory;
  }

  return {
    decisions: [],
    conventions: [],
    notes: [],
    context: {},
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Save memory to disk
 */
function saveMemory(memory: Memory): void {
  memory.lastUpdated = new Date().toISOString();

  // Ensure directory exists
  const dir = dirname(MEMORY_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Initialize memory
let memory = loadMemory();

// Create MCP server
const server = new McpServer({
  name: 'project-memory',
  version: '1.0.0',
});

// ============================================================================
// TOOLS
// ============================================================================

/**
 * Remember a decision
 */
server.tool(
  'remember_decision',
  'Store an architectural or design decision for future reference',
  {
    title: z.string().describe('Short title for the decision'),
    description: z.string().describe('Detailed description of the decision'),
    rationale: z.string().describe('Why this decision was made'),
    tags: z.array(z.string()).optional().describe('Tags for categorization'),
  },
  async ({ title, description, rationale, tags }) => {
    const decision: Decision = {
      id: generateId(),
      title,
      description,
      rationale,
      date: new Date().toISOString(),
      tags: tags || [],
    };

    memory.decisions.push(decision);
    saveMemory(memory);

    return {
      content: [
        {
          type: 'text',
          text: `Decision recorded: "${title}" (ID: ${decision.id})`,
        },
      ],
    };
  }
);

/**
 * Recall decisions
 */
server.tool(
  'recall_decisions',
  'Search and retrieve past decisions',
  {
    query: z.string().optional().describe('Search query (searches title, description, tags)'),
    tag: z.string().optional().describe('Filter by specific tag'),
    limit: z.number().optional().describe('Maximum number of results'),
  },
  async ({ query, tag, limit }) => {
    let results = memory.decisions;

    // Filter by tag
    if (tag) {
      results = results.filter((d) =>
        d.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
      );
    }

    // Search by query
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Apply limit
    if (limit && limit > 0) {
      results = results.slice(0, limit);
    }

    return {
      content: [
        {
          type: 'text',
          text:
            results.length > 0
              ? JSON.stringify(results, null, 2)
              : 'No decisions found matching your criteria.',
        },
      ],
    };
  }
);

/**
 * Add a coding convention
 */
server.tool(
  'add_convention',
  'Record a coding convention or best practice for the project',
  {
    name: z.string().describe('Name of the convention'),
    description: z.string().describe('Description of the convention'),
    examples: z.array(z.string()).optional().describe('Code examples'),
    category: z.string().optional().describe('Category (e.g., naming, structure, testing)'),
  },
  async ({ name, description, examples, category }) => {
    const convention: Convention = {
      id: generateId(),
      name,
      description,
      examples: examples || [],
      category: category || 'general',
    };

    memory.conventions.push(convention);
    saveMemory(memory);

    return {
      content: [
        {
          type: 'text',
          text: `Convention recorded: "${name}" in category "${convention.category}"`,
        },
      ],
    };
  }
);

/**
 * Get conventions
 */
server.tool(
  'get_conventions',
  'Retrieve coding conventions, optionally filtered by category',
  {
    category: z.string().optional().describe('Filter by category'),
  },
  async ({ category }) => {
    let results = memory.conventions;

    if (category) {
      results = results.filter((c) =>
        c.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    return {
      content: [
        {
          type: 'text',
          text:
            results.length > 0
              ? JSON.stringify(results, null, 2)
              : 'No conventions found.',
        },
      ],
    };
  }
);

/**
 * Add a note
 */
server.tool(
  'add_note',
  'Add a general note or piece of information to remember',
  {
    title: z.string().describe('Note title'),
    content: z.string().describe('Note content'),
    tags: z.array(z.string()).optional().describe('Tags for organization'),
  },
  async ({ title, content, tags }) => {
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
          type: 'text',
          text: `Note saved: "${title}" (ID: ${note.id})`,
        },
      ],
    };
  }
);

/**
 * Search notes
 */
server.tool(
  'search_notes',
  'Search through saved notes',
  {
    query: z.string().describe('Search query'),
  },
  async ({ query }) => {
    const q = query.toLowerCase();
    const results = memory.notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    );

    return {
      content: [
        {
          type: 'text',
          text:
            results.length > 0
              ? JSON.stringify(results, null, 2)
              : 'No notes found matching your query.',
        },
      ],
    };
  }
);

/**
 * Set context value
 */
server.tool(
  'set_context',
  'Store a key-value pair in project context',
  {
    key: z.string().describe('Context key'),
    value: z.string().describe('Context value'),
  },
  async ({ key, value }) => {
    memory.context[key] = value;
    saveMemory(memory);

    return {
      content: [
        {
          type: 'text',
          text: `Context updated: ${key} = ${value}`,
        },
      ],
    };
  }
);

/**
 * Get context value
 */
server.tool(
  'get_context',
  'Retrieve a value from project context',
  {
    key: z.string().optional().describe('Specific key to retrieve (omit for all)'),
  },
  async ({ key }) => {
    if (key) {
      const value = memory.context[key];
      return {
        content: [
          {
            type: 'text',
            text: value ? `${key}: ${value}` : `No context found for key: ${key}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(memory.context, null, 2),
        },
      ],
    };
  }
);

/**
 * Get memory summary
 */
server.tool(
  'memory_summary',
  'Get a summary of all stored memory',
  {},
  async () => {
    const summary = {
      decisions: memory.decisions.length,
      conventions: memory.conventions.length,
      notes: memory.notes.length,
      contextKeys: Object.keys(memory.context).length,
      lastUpdated: memory.lastUpdated,
    };

    return {
      content: [
        {
          type: 'text',
          text: `Memory Summary:\n${JSON.stringify(summary, null, 2)}`,
        },
      ],
    };
  }
);

// ============================================================================
// RESOURCES
// ============================================================================

/**
 * All decisions resource
 */
server.resource(
  'memory://decisions',
  'All recorded architectural decisions',
  async () => ({
    contents: [
      {
        uri: 'memory://decisions',
        text: JSON.stringify(memory.decisions, null, 2),
        mimeType: 'application/json',
      },
    ],
  })
);

/**
 * All conventions resource
 */
server.resource(
  'memory://conventions',
  'All coding conventions',
  async () => ({
    contents: [
      {
        uri: 'memory://conventions',
        text: JSON.stringify(memory.conventions, null, 2),
        mimeType: 'application/json',
      },
    ],
  })
);

/**
 * All notes resource
 */
server.resource(
  'memory://notes',
  'All saved notes',
  async () => ({
    contents: [
      {
        uri: 'memory://notes',
        text: JSON.stringify(memory.notes, null, 2),
        mimeType: 'application/json',
      },
    ],
  })
);

/**
 * Project context resource
 */
server.resource(
  'memory://context',
  'Project context key-value store',
  async () => ({
    contents: [
      {
        uri: 'memory://context',
        text: JSON.stringify(memory.context, null, 2),
        mimeType: 'application/json',
      },
    ],
  })
);

// ============================================================================
// START SERVER
// ============================================================================

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is for MCP communication)
  console.error(`Memory server started. Storage: ${MEMORY_PATH}`);
  console.error(`Loaded: ${memory.decisions.length} decisions, ${memory.conventions.length} conventions, ${memory.notes.length} notes`);
}

main().catch((error) => {
  console.error('Failed to start memory server:', error);
  process.exit(1);
});
