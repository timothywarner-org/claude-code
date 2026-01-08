# MCP Security Considerations

## Overview

When building MCP servers that give Claude access to external systems, security is paramount. This guide covers best practices for secure MCP development.

## Authentication & Authorization

### API Key Management

```typescript
// DON'T: Hardcode secrets
const apiKey = 'sk-secret-key-here';

// DO: Use environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY environment variable required');
}
```

### Token Validation

```typescript
import { z } from 'zod';

// Validate token format before use
const TokenSchema = z.string().regex(/^ghp_[a-zA-Z0-9]{36}$/);

function validateGitHubToken(token: string): boolean {
  return TokenSchema.safeParse(token).success;
}
```

### Scope Limitation

```typescript
// Limit what the MCP server can access
const ALLOWED_REPOS = ['org/repo1', 'org/repo2'];

server.tool(
  'get_repo',
  'Get repository information',
  { repo: z.string() },
  async ({ repo }) => {
    if (!ALLOWED_REPOS.includes(repo)) {
      return {
        content: [{ type: 'text', text: 'Access denied: repo not in allowed list' }],
        isError: true,
      };
    }
    // ... proceed with operation
  }
);
```

## Input Validation

### Always Validate with Zod

```typescript
import { z } from 'zod';

// Define strict schemas
const QuerySchema = z.object({
  table: z.enum(['users', 'orders', 'products']),
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).default(0),
});

server.tool(
  'query_data',
  'Query database table',
  {
    table: z.enum(['users', 'orders', 'products']),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
  },
  async (input) => {
    // Input is already validated by Zod
    const { table, limit, offset } = input;
    // Safe to use
  }
);
```

### Prevent Injection Attacks

```typescript
// DON'T: String concatenation for queries
const query = `SELECT * FROM users WHERE id = ${userId}`;

// DO: Parameterized queries
const query = 'SELECT * FROM users WHERE id = $1';
const result = await db.query(query, [userId]);
```

### Path Traversal Prevention

```typescript
import { resolve, normalize } from 'path';

const ALLOWED_BASE = '/safe/directory';

function sanitizePath(userPath: string): string {
  // Normalize and resolve the path
  const resolved = resolve(ALLOWED_BASE, userPath);

  // Ensure it's still within allowed directory
  if (!resolved.startsWith(ALLOWED_BASE)) {
    throw new Error('Path traversal detected');
  }

  return resolved;
}
```

## Rate Limiting

### Implement Request Limits

```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limit: number;
  private windowMs: number;

  constructor(limit = 100, windowMs = 60000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  check(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests
    const recent = requests.filter((time) => now - time < this.windowMs);

    if (recent.length >= this.limit) {
      return false; // Rate limited
    }

    recent.push(now);
    this.requests.set(key, recent);
    return true;
  }
}

const limiter = new RateLimiter(100, 60000); // 100 requests per minute

server.tool(
  'expensive_operation',
  'Rate-limited operation',
  { input: z.string() },
  async ({ input }) => {
    if (!limiter.check('expensive_operation')) {
      return {
        content: [{ type: 'text', text: 'Rate limit exceeded. Try again later.' }],
        isError: true,
      };
    }
    // Proceed with operation
  }
);
```

## Audit Logging

### Log All Operations

```typescript
interface AuditLog {
  timestamp: string;
  tool: string;
  input: unknown;
  result: 'success' | 'error';
  error?: string;
  duration: number;
}

const auditLogs: AuditLog[] = [];

function logOperation(
  tool: string,
  input: unknown,
  result: 'success' | 'error',
  duration: number,
  error?: string
): void {
  const log: AuditLog = {
    timestamp: new Date().toISOString(),
    tool,
    input,
    result,
    duration,
    error,
  };

  auditLogs.push(log);

  // Also write to file or external logging service
  console.error(JSON.stringify(log));
}
```

### Sensitive Data Handling

```typescript
function sanitizeForLogging(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) {
    return input;
  }

  const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apiKey', 'authorization'];
  const sanitized = { ...input } as Record<string, unknown>;

  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}
```

## Error Handling

### Don't Expose Internal Details

```typescript
// DON'T: Expose stack traces
try {
  await operation();
} catch (error) {
  return { content: [{ type: 'text', text: error.stack }] };
}

// DO: Return safe error messages
try {
  await operation();
} catch (error) {
  console.error('Internal error:', error); // Log internally

  return {
    content: [{
      type: 'text',
      text: 'An error occurred processing your request. Please try again.',
    }],
    isError: true,
  };
}
```

## Resource Limits

### Limit Response Sizes

```typescript
const MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB

server.tool(
  'read_file',
  'Read a file',
  { path: z.string() },
  async ({ path }) => {
    const stats = await fs.stat(path);

    if (stats.size > MAX_RESPONSE_SIZE) {
      return {
        content: [{
          type: 'text',
          text: `File too large (${stats.size} bytes). Maximum: ${MAX_RESPONSE_SIZE} bytes`,
        }],
        isError: true,
      };
    }

    const content = await fs.readFile(path, 'utf-8');
    return { content: [{ type: 'text', text: content }] };
  }
);
```

### Timeout Long Operations

```typescript
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeout]);
}

server.tool(
  'long_operation',
  'Operation that might take a while',
  { input: z.string() },
  async ({ input }) => {
    try {
      const result = await withTimeout(
        performOperation(input),
        30000, // 30 second timeout
        'long_operation'
      );
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: error.message }],
        isError: true,
      };
    }
  }
);
```

## Deployment Checklist

- [ ] All secrets in environment variables
- [ ] Input validation on all tools
- [ ] Rate limiting implemented
- [ ] Audit logging enabled
- [ ] Error messages don't expose internals
- [ ] Response size limits in place
- [ ] Timeouts on all external calls
- [ ] Path traversal prevention
- [ ] SQL injection prevention
- [ ] Scope/permission limits defined
- [ ] HTTPS for remote transports
- [ ] Token rotation strategy
