# Exercise 3: Connect MCP to GitHub API

## Learning Objectives

By the end of this exercise, you will be able to:

1. Integrate external REST APIs with MCP servers
2. Handle OAuth authentication flows in MCP
3. Implement GitHub-specific operations (issues, PRs, repos)
4. Manage rate limiting and pagination
5. Create a production-ready GitHub MCP integration

## Prerequisites

- Completed Exercises 1 and 2
- GitHub account with personal access token
- Understanding of GitHub's REST API
- Familiarity with OAuth concepts

## Background

Integrating GitHub with Claude via MCP enables powerful workflows:

- Automated code review and PR management
- Issue triage and labeling
- Repository analysis and documentation
- Commit history analysis
- Automated release notes generation

This exercise focuses on building a GitHub MCP server from scratch (note: an official
GitHub MCP server exists, but building your own teaches core integration patterns).

## Step-by-Step Instructions

### Step 1: Set Up GitHub Authentication

Create a GitHub Personal Access Token (PAT):

1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a new token (classic) with these scopes:
   - `repo` (full repository access)
   - `read:org` (read organization data)
   - `read:user` (read user profile)
3. Save the token securely

Configure the token in your environment:

```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

### Step 2: Create the MCP Server Structure

Create a new file `github_mcp_server.ts` with:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});
```

### Step 3: Implement Repository Tools

Create tools for repository operations:

**list_repos**

- List user's repositories
- Filter by visibility, sort order
- Include fork status and language

**get_repo**

- Fetch repository details
- Include README content
- Show recent activity

**search_repos**

- Search public repositories
- Filter by language, stars, forks
- Pagination support

### Step 4: Implement Issue Tools

**list_issues**

- List issues for a repository
- Filter by state, labels, assignee
- Sort by created, updated, comments

**create_issue**

- Create new issues
- Support labels and assignees
- Include body with markdown

**update_issue**

- Update issue state (open/closed)
- Modify labels and assignees
- Add comments

### Step 5: Implement Pull Request Tools

**list_prs**

- List pull requests
- Filter by state, base branch
- Include review status

**get_pr_diff**

- Fetch PR diff content
- Show file changes
- Include review comments

**create_pr_review**

- Submit PR review
- Support approve/request changes/comment
- Add inline comments

### Step 6: Implement Rate Limiting

Handle GitHub's rate limits gracefully:

```typescript
async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const response = await fn();

  // Check rate limit headers
  const remaining = response.headers['x-ratelimit-remaining'];
  const reset = response.headers['x-ratelimit-reset'];

  if (remaining && parseInt(remaining) < 10) {
    console.error(`Rate limit warning: ${remaining} requests remaining`);
  }

  return response;
}
```

### Step 7: Implement Pagination

Handle paginated responses:

```typescript
async function getAllPages<T>(
  method: (options: { page: number; per_page: number }) => Promise<{ data: T[] }>
): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data } = await method({ page, per_page: perPage });
    results.push(...data);

    if (data.length < perPage) break;
    page++;
  }

  return results;
}
```

### Step 8: Add Caching Layer

Implement caching for frequently accessed data:

```typescript
const cache = new Map<string, { data: unknown; expires: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) {
    return entry.data as T;
  }
  return null;
}

function setCache(key: string, data: unknown, ttlSeconds: number): void {
  cache.set(key, {
    data,
    expires: Date.now() + ttlSeconds * 1000,
  });
}
```

### Step 9: Test Your Integration

Register and test with Claude Code:

```bash
claude mcp add github-server --command "npx ts-node github_mcp_server.ts"
```

Test with prompts:

- "List my recent GitHub repositories"
- "Show open issues in owner/repo"
- "Create an issue for bug X in owner/repo"
- "What PRs need my review?"

## Expected Outcomes

After completing this exercise:

1. All GitHub tools work with your PAT
2. Rate limiting is handled gracefully
3. Pagination returns complete results
4. Caching reduces API calls
5. Error handling provides useful feedback

## Verification Checklist

- [ ] Authentication works with GitHub PAT
- [ ] list_repos returns your repositories
- [ ] list_issues filters work correctly
- [ ] create_issue successfully creates issues
- [ ] PR tools show diff content
- [ ] Rate limit warnings appear appropriately
- [ ] Pagination fetches all results

## Bonus Challenges

### Challenge 1: Webhook Integration

Set up a webhook receiver to get real-time updates:

- Configure GitHub webhooks
- Process push events
- Handle issue/PR events
- Store events for Claude context

### Challenge 2: Code Analysis Tools

Add tools for code analysis:

- `analyze_codeowners` - Parse CODEOWNERS file
- `get_file_history` - Show commit history for a file
- `compare_branches` - Show diff between branches
- `find_contributors` - List top contributors

### Challenge 3: Release Management

Implement release automation:

- `generate_changelog` - Create changelog from commits
- `create_release` - Create GitHub release
- `list_releases` - Show release history

### Challenge 4: GitHub Actions Integration

Add CI/CD tools:

- `list_workflows` - Show repository workflows
- `get_workflow_runs` - List recent runs
- `trigger_workflow` - Manually trigger workflow
- `get_run_logs` - Fetch workflow run logs

## Architecture Notes

### Security Considerations

1. **Never log tokens** - Ensure PAT is not printed to logs
2. **Scope minimization** - Request only needed permissions
3. **Token rotation** - Support token refresh
4. **Audit logging** - Log API operations (not credentials)

### Error Handling Matrix

| Error Code | Meaning            | Action              |
| ---------- | ------------------ | ------------------- |
| 401        | Bad credentials    | Check token         |
| 403        | Rate limited       | Wait and retry      |
| 404        | Resource not found | Validate inputs     |
| 422        | Validation failed  | Check request body  |
| 500        | Server error       | Retry with backoff  |

### Performance Optimization

1. Use conditional requests (`If-None-Match` header)
2. Cache repository metadata
3. Batch operations where possible
4. Use GraphQL for complex queries

## Common Issues and Solutions

### Issue: "Bad credentials" error

Verify your token:

```bash
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

### Issue: Rate limit exceeded

Implement exponential backoff:

```typescript
const resetTime = parseInt(headers['x-ratelimit-reset']);
const waitMs = resetTime * 1000 - Date.now();
await new Promise((resolve) => setTimeout(resolve, waitMs));
```

### Issue: Large diff content

Truncate or summarize large diffs:

```typescript
const MAX_DIFF_SIZE = 50000;
if (diff.length > MAX_DIFF_SIZE) {
  return diff.slice(0, MAX_DIFF_SIZE) + '\n... (truncated)';
}
```

## Resources

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [Octokit.js SDK](https://github.com/octokit/octokit.js)
- [GitHub Rate Limiting](https://docs.github.com/en/rest/rate-limit)
- [GitHub GraphQL API](https://docs.github.com/en/graphql)
