# Semantic Versioning Guide

Reference for choosing the correct version bump.

## Version Format

```
MAJOR.MINOR.PATCH
  │     │     │
  │     │     └── Bug fixes, no API changes
  │     └──────── New features, backwards compatible
  └────────────── Breaking changes
```

## When to Use Each

### PATCH (1.0.0 → 1.0.1)

Use for:
- Bug fixes that don't change behavior
- Performance improvements
- Documentation updates
- Dependency updates (non-breaking)
- Internal refactoring

**Examples:**
```
fix: Correct null check in user validation
fix: Handle edge case in date parsing
perf: Optimize database query
docs: Update API documentation
chore: Update lodash to latest patch
```

### MINOR (1.0.0 → 1.1.0)

Use for:
- New features
- New API endpoints
- New optional parameters
- Deprecation of existing features
- Substantial improvements

**Examples:**
```
feat: Add dark mode support
feat: Add export to CSV functionality
feat: Add optional 'limit' parameter to search
deprecate: Mark legacy auth method as deprecated
```

### MAJOR (1.0.0 → 2.0.0)

Use for:
- Breaking API changes
- Removed features
- Changed default behavior
- Major dependency updates
- Minimum runtime version changes

**Examples:**
```
BREAKING: Remove deprecated v1 endpoints
BREAKING: Change response format for /users
BREAKING: Require Node.js 18+
BREAKING: Rename 'callback' to 'onComplete'
```

## Decision Tree

```
Is it a bug fix with no behavior change?
├── Yes → PATCH
└── No
    ├── Does it add new functionality?
    │   ├── Yes, backwards compatible → MINOR
    │   └── Yes, requires changes → MAJOR
    └── Does it change existing behavior?
        ├── No, internal only → PATCH
        ├── Yes, backwards compatible → MINOR
        └── Yes, breaks existing code → MAJOR
```

## Breaking Change Examples

### API Changes
```typescript
// BEFORE (1.0.0)
function getUser(id: string): User

// AFTER (2.0.0) - Breaking: different return type
function getUser(id: string): Promise<User>
```

### Parameter Changes
```typescript
// BEFORE (1.0.0)
function search(query: string, limit?: number)

// AFTER (2.0.0) - Breaking: required parameter
function search(query: string, options: SearchOptions)
```

### Behavior Changes
```typescript
// BEFORE (1.0.0) - Returns null for missing user
function findUser(id): User | null

// AFTER (2.0.0) - Throws for missing user
function findUser(id): User  // throws UserNotFoundError
```

## Pre-release Versions

For unstable releases:
- `1.0.0-alpha.1` - Early development
- `1.0.0-beta.1` - Feature complete, testing
- `1.0.0-rc.1` - Release candidate

## Zero Version (0.x.y)

During initial development:
- `0.x.y` - Anything may change
- `0.1.0` → `0.2.0` - Any significant change
- Don't use `0.x.y` in production

## Quick Reference

| Change Type | Example | Version Bump |
|-------------|---------|--------------|
| Bug fix | Fix typo | PATCH |
| New feature | Add search | MINOR |
| Remove feature | Delete v1 API | MAJOR |
| Change default | New default timeout | MAJOR |
| Add parameter | Optional filter | MINOR |
| Require parameter | Make filter required | MAJOR |
| Dependency update | Update to React 18 | Depends on impact |
