/**
 * Segment 3: GitHub Integration Demo
 *
 * Shows how to use the official GitHub MCP server and build
 * custom GitHub integrations.
 *
 * Run: npx tsx segment_3_mcp/03_github_integration.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient, getModel } from '../src/utils/client.js';
import { logger } from '../src/utils/logger.js';

/**
 * Show how to configure the official GitHub MCP server
 */
function showGitHubMCPSetup(): void {
  logger.section('GitHub MCP Server Setup');

  console.log(`
The official GitHub MCP server provides comprehensive GitHub access.

1. INSTALL THE SERVER

   # The server is available as an npm package
   npx -y @modelcontextprotocol/server-github

2. CONFIGURE IN CLAUDE CODE

   Add to .claude/settings.json:

   {
     "mcpServers": {
       "github": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-github"],
         "env": {
           "GITHUB_TOKEN": "\${GITHUB_TOKEN}"
         }
       }
     }
   }

3. SET YOUR GITHUB TOKEN

   # Create a token at: https://github.com/settings/tokens
   # Required scopes: repo, read:org, read:user

   export GITHUB_TOKEN=ghp_your_token_here

4. AVAILABLE TOOLS

   The GitHub MCP server provides these tools:
   - search_repositories: Search GitHub repos
   - get_repository: Get repo details
   - list_issues: List repo issues
   - create_issue: Create new issue
   - get_pull_request: Get PR details
   - list_pull_requests: List PRs
   - create_pull_request: Create new PR
   - get_file_contents: Read files from repo
   - create_or_update_file: Write files to repo
   - and many more...
`);
}

/**
 * Demo: Build a custom GitHub tool
 */
async function demoCustomGitHubTool(client: Anthropic): Promise<void> {
  logger.section('Custom GitHub Tool Demo');

  // Define a custom tool for PR review
  const tools: Anthropic.Tool[] = [
    {
      name: 'analyze_pr',
      description: 'Analyze a GitHub pull request and provide review comments',
      input_schema: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner' },
          repo: { type: 'string', description: 'Repository name' },
          pr_number: { type: 'number', description: 'Pull request number' },
        },
        required: ['owner', 'repo', 'pr_number'],
      },
    },
  ];

  // Simulated PR data
  const prData = {
    title: 'Add user authentication',
    description: 'Implements JWT-based authentication',
    files: [
      {
        filename: 'src/auth/jwt.ts',
        additions: 45,
        deletions: 0,
        patch: `
+import jwt from 'jsonwebtoken';
+
+export function generateToken(userId: string): string {
+  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
+}
+
+export function verifyToken(token: string): { userId: string } {
+  return jwt.verify(token, process.env.JWT_SECRET) as { userId: string };
+}`,
      },
      {
        filename: 'src/routes/auth.ts',
        additions: 30,
        deletions: 5,
        patch: `
+router.post('/login', async (req, res) => {
+  const { email, password } = req.body;
+  const user = await db.users.findByEmail(email);
+  if (user && await bcrypt.compare(password, user.passwordHash)) {
+    const token = generateToken(user.id);
+    res.json({ token });
+  } else {
+    res.status(401).json({ error: 'Invalid credentials' });
+  }
+});`,
      },
    ],
  };

  logger.subsection('Asking Claude to review PR...');

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 2048,
    tools,
    messages: [
      {
        role: 'user',
        content: 'Please analyze PR #42 in owner/repo and provide a code review.',
      },
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'analyze_pr',
            input: { owner: 'owner', repo: 'repo', pr_number: 42 },
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tool_1',
            content: JSON.stringify(prData),
          },
        ],
      },
    ],
  });

  for (const block of response.content) {
    if (block.type === 'text') {
      console.log(block.text);
    }
  }
}

/**
 * Show GitHub workflow patterns
 */
function showWorkflowPatterns(): void {
  logger.section('GitHub Workflow Patterns');

  console.log(`
PATTERN 1: AUTOMATED ISSUE TRIAGE
─────────────────────────────────
Claude analyzes new issues and:
- Adds appropriate labels
- Assigns to team members
- Suggests related issues

Example prompt:
"Analyze issue #123 and suggest labels based on content"


PATTERN 2: PR REVIEW ASSISTANT
──────────────────────────────
Claude reviews PRs for:
- Security vulnerabilities
- Code style issues
- Missing tests
- Documentation gaps

Example prompt:
"Review PR #456 focusing on security and performance"


PATTERN 3: RELEASE NOTES GENERATOR
──────────────────────────────────
Claude generates release notes by:
- Listing merged PRs since last release
- Categorizing changes
- Highlighting breaking changes

Example prompt:
"Generate release notes for v2.0.0 based on PRs since v1.9.0"


PATTERN 4: DOCUMENTATION UPDATER
────────────────────────────────
Claude keeps docs in sync by:
- Detecting API changes
- Updating README examples
- Generating API documentation

Example prompt:
"Update the API documentation based on recent changes to src/api/"


PATTERN 5: CODEBASE Q&A
───────────────────────
Claude answers questions about code:
- Architecture decisions
- How features work
- Where to find specific functionality

Example prompt:
"How does authentication work in this codebase?"
`);
}

/**
 * Show example MCP configuration
 */
function showCompleteConfig(): void {
  logger.section('Complete MCP Configuration');

  const config = `
// .claude/settings.json
{
  "mcpServers": {
    // Official GitHub server
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "\${GITHUB_TOKEN}"
      }
    },

    // Our custom memory server
    "memory": {
      "command": "npx",
      "args": ["tsx", "./segment_3_mcp/02_json_memory_server/server.ts"],
      "env": {
        "MCP_MEMORY_PATH": "./data/memory.json"
      }
    },

    // File system access (official)
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./src", "./docs"]
    }
  },

  // Claude Code settings
  "allowedTools": ["Read", "Glob", "Grep", "Bash", "Edit", "Write"],
  "customInstructions": "Use the memory server to store important decisions."
}
`;

  logger.code(config, 'JSON');
}

/**
 * Main demo runner
 */
async function main(): Promise<void> {
  logger.section('GitHub Integration Demo');

  // Show setup instructions
  showGitHubMCPSetup();

  // Demo custom tool
  const client = createClient();
  await demoCustomGitHubTool(client);

  // Show workflow patterns
  showWorkflowPatterns();

  // Show complete configuration
  showCompleteConfig();

  logger.section('Next Steps');
  console.log(`
1. Set up your GITHUB_TOKEN environment variable
2. Add the GitHub MCP server to your Claude Code config
3. Try: "claude 'List open issues in my repo'"
4. Explore: claude /mcp (to see available tools)
`);
}

main().catch((error) => {
  logger.error(`Demo failed: ${error.message}`);
  process.exit(1);
});
