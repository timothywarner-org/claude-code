# Exercise 2: Extend the Memory Server with New Capabilities

## Learning Objectives

By the end of this exercise, you will be able to:

1. Understand persistent memory patterns in MCP servers
2. Implement CRUD operations for memory storage
3. Add semantic search capabilities to stored memories
4. Create memory namespaces for organization
5. Implement memory expiration and cleanup

## Prerequisites

- Completed Exercise 1 (Build a Custom MCP Tool)
- Understanding of async/await patterns
- Basic knowledge of file system operations
- Familiarity with JSON data structures

## Background

Memory servers allow Claude to persist information across conversations. This is critical
for:

- Maintaining context over long-running projects
- Storing user preferences and configurations
- Building knowledge bases from interactions
- Creating stateful AI assistants

In this exercise, you will extend a basic memory server with advanced features.

## Step-by-Step Instructions

### Step 1: Review the Starter Code

Open `exercise_2_starter.ts` and examine the basic memory server structure:

- File-based persistence using JSON
- Basic `store_memory` and `recall_memory` tools
- Simple key-value storage

### Step 2: Add Memory Namespaces

Implement namespace support to organize memories:

```typescript
interface Memory {
  key: string;
  value: string;
  namespace: string;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  tags: string[];
}
```

Update the store_memory tool to accept a namespace parameter.

### Step 3: Implement Search Functionality

Add a `search_memories` tool that can:

1. Search by keyword in values
2. Filter by namespace
3. Filter by tags
4. Sort by recency or relevance

### Step 4: Add Memory Expiration

Implement TTL (Time To Live) support:

1. Add optional `ttl` parameter to store_memory
2. Create background cleanup for expired memories
3. Add `list_expiring` tool to show soon-to-expire items

### Step 5: Implement Bulk Operations

Add tools for batch processing:

- `bulk_store`: Store multiple memories at once
- `bulk_delete`: Delete memories by pattern or namespace
- `export_memories`: Export all memories as JSON
- `import_memories`: Import memories from JSON

### Step 6: Add Memory Statistics

Create a `memory_stats` tool that returns:

```typescript
{
  totalMemories: number;
  byNamespace: Record<string, number>;
  oldestMemory: Date;
  newestMemory: Date;
  totalSizeBytes: number;
}
```

### Step 7: Implement Related Memories

Add a `find_related` tool that suggests related memories based on:

- Shared tags
- Similar keys
- Temporal proximity (stored around the same time)

### Step 8: Test Your Implementation

Create test scenarios:

```typescript
// Store memories in different namespaces
await callTool('store_memory', {
  key: 'project-goals',
  value: 'Complete MCP training course',
  namespace: 'work',
  tags: ['goals', 'learning'],
});

// Search across namespaces
await callTool('search_memories', {
  query: 'training',
  namespaces: ['work', 'personal'],
});

// Get memory statistics
await callTool('memory_stats', {});
```

## Expected Outcomes

After completing this exercise:

1. Memories are organized into namespaces
2. Search returns relevant results with highlighting
3. Expired memories are automatically cleaned up
4. Bulk operations work correctly
5. Statistics accurately reflect memory state

## Verification Checklist

- [ ] Namespaces correctly isolate memories
- [ ] Search finds partial matches
- [ ] TTL expiration works correctly
- [ ] Bulk operations handle errors gracefully
- [ ] Statistics are accurate
- [ ] Related memories algorithm produces useful results

## Bonus Challenges

### Challenge 1: Encryption at Rest

Encrypt stored memories using a passphrase:

- Implement AES-256 encryption
- Add `unlock_memories` tool that requires passphrase
- Auto-lock after inactivity

### Challenge 2: Memory Versioning

Track changes to memories:

- Store version history
- Add `get_memory_history` tool
- Implement `restore_version` to rollback changes

### Challenge 3: Memory Deduplication

Detect and merge duplicate or similar memories:

- Implement similarity scoring
- Add `find_duplicates` tool
- Create `merge_memories` operation

### Challenge 4: Memory Importance Scoring

Implement an importance algorithm:

- Track access frequency
- Consider age and recency
- Add `get_important_memories` tool

## Architecture Notes

### File Structure

```
~/.claude-code/memory/
  ├── index.json          # Memory index for fast lookups
  ├── namespaces/
  │   ├── default.json    # Default namespace
  │   ├── work.json       # Work namespace
  │   └── personal.json   # Personal namespace
  └── backups/
      └── backup-{date}.json
```

### Performance Considerations

- Use an index file for fast key lookups
- Lazy-load namespace files
- Batch write operations
- Consider SQLite for larger memory stores

## Common Issues and Solutions

### Issue: Memory file corruption

Implement atomic writes using temp files and rename.

### Issue: Slow search on large memory stores

Add an inverted index for keyword search.

### Issue: Race conditions on concurrent access

Implement file locking or use a proper database.

## Resources

- [MCP Resources Specification](https://modelcontextprotocol.io/specification)
- [Node.js File System Best Practices](https://nodejs.org/api/fs.html)
- [JSON Storage Patterns](https://www.json.org/json-en.html)
