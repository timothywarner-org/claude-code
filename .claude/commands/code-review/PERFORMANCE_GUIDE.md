# Performance Review Guide

Reference guide for performance analysis during code review.

## Database Patterns

### N+1 Query Detection

**Problem:** Fetching related data in a loop instead of a single query.

```typescript
// BAD: N+1 queries
const users = await db.users.findAll();
for (const user of users) {
  user.posts = await db.posts.findByUserId(user.id);  // N queries!
}

// GOOD: Eager loading
const users = await db.users.findAll({
  include: [{ model: Post }]
});

// GOOD: Batch query
const users = await db.users.findAll();
const userIds = users.map(u => u.id);
const posts = await db.posts.findAll({ where: { userId: userIds } });
```

### Missing Indexes

Check for queries on non-indexed columns:

```typescript
// If this query is slow, add index
const user = await db.users.findOne({ where: { email } });

// Migration to add index
await queryInterface.addIndex('users', ['email']);
```

### Unbounded Queries

```typescript
// BAD: No limit
const allPosts = await db.posts.findAll();

// GOOD: Paginated
const posts = await db.posts.findAll({
  limit: 20,
  offset: page * 20
});
```

## JavaScript/TypeScript Patterns

### Unnecessary Iterations

```typescript
// BAD: Multiple iterations
const filtered = items.filter(x => x.active);
const mapped = filtered.map(x => x.name);
const sorted = mapped.sort();

// GOOD: Single pass with reduce or chain
const result = items
  .filter(x => x.active)
  .map(x => x.name)
  .sort();

// BETTER for large arrays: Single reduce
const result = items.reduce((acc, x) => {
  if (x.active) acc.push(x.name);
  return acc;
}, []).sort();
```

### Memory Leaks

```typescript
// BAD: Event listener not cleaned up
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);

// GOOD: Cleanup function
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### Blocking Operations

```typescript
// BAD: Synchronous file read
const data = fs.readFileSync('large-file.json');

// GOOD: Async read
const data = await fs.promises.readFile('large-file.json');

// BETTER: Stream for large files
const stream = fs.createReadStream('large-file.json');
```

## API Patterns

### Payload Size

```typescript
// BAD: Returning entire objects
app.get('/users', async (req, res) => {
  const users = await db.users.findAll();
  res.json(users);  // Includes all fields!
});

// GOOD: Select specific fields
app.get('/users', async (req, res) => {
  const users = await db.users.findAll({
    attributes: ['id', 'name', 'email']
  });
  res.json(users);
});
```

### Caching Opportunities

```typescript
// BAD: Fetching on every request
app.get('/config', async (req, res) => {
  const config = await db.config.findOne();
  res.json(config);
});

// GOOD: Cache static data
let configCache = null;
app.get('/config', async (req, res) => {
  if (!configCache) {
    configCache = await db.config.findOne();
  }
  res.json(configCache);
});
```

## Performance Metrics

When reviewing, look for:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Response time | > 200ms | Investigate |
| Query count | > 10/request | Check N+1 |
| Payload size | > 1MB | Paginate/compress |
| Memory growth | Unbounded | Check leaks |

## Profiling Commands

```bash
# Node.js profiling
node --prof app.js
node --prof-process isolate-*.log > profile.txt

# Memory snapshot
node --inspect app.js
# Then use Chrome DevTools

# Database query analysis
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```
