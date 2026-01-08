# Claude Code and Large-Context Reasoning

<img src="images/cover.png" alt="Claude Code and Large-Context Reasoning cover" width="400">

[![Website TechTrainerTim.com](https://img.shields.io/badge/Website-TechTrainerTim.com-0a66c2)](https://techtrainertim.com) [![GitHub timothywarner-org](https://img.shields.io/badge/GitHub-timothywarner--org-181717?logo=github)](https://github.com/timothywarner-org) [![Node.js 20+](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**O'Reilly Live Learning Course** | 4 Hours | Claude Code + MCP + 200K Context

While other AI assistants lose context after a few files, Claude's revolutionary 200K context window can analyze entire codebases in a single conversation. With Model Context Protocol (MCP), that intelligence persists across sessions. This course teaches developers how to leverage Claude's unmatched context capabilities for real-world development.

## Course Overview

| Segment | Focus | Difficulty | Key Skills |
|---------|-------|------------|------------|
| Segment 1 | Claude Fundamentals & Unique Architecture | Intro | 200K context, streaming, tool use, constitutional AI |
| Segment 2 | Claude Code CLI Deep Dive | Intermediate | Terminal workflows, git hooks, code review automation |
| Segment 3 | MCP Servers & Advanced Integration | Intermediate | MCP architecture, persistent memory, tool connectivity |
| Segment 4 | Production Workflows & Enterprise Strategy | Advanced | CI/CD integration, cost optimization, team adoption |

## What You'll Build

A production-ready **Claude development environment** with persistent memory:

| Component | Purpose | Capabilities |
|-----------|---------|--------------|
| **MCP Memory Server** | Persistent Context | Remembers project architecture, API patterns, team conventions |
| **Claude Code Setup** | Terminal Workflows | Automated PR reviews, refactoring, deployment assistance |
| **CI/CD Integration** | GitHub Actions | Claude-powered code review bot, documentation generation |

## Prerequisites

- Basic programming knowledge (TypeScript/JavaScript examples used)
- Claude account (free tier works, Pro recommended for API features)
- VS Code or Cursor installed
- Comfortable with terminal/command line basics

**Required accounts and tools:**

| Resource | URL | Notes |
|----------|-----|-------|
| Claude Account | <https://claude.ai/> | Pro recommended for extended features |
| Anthropic API | <https://console.anthropic.com/> | For Claude Code CLI and API demos |
| GitHub Account | <https://github.com/> | For workflow integration demos |

## Repository Structure

```text
claude-code/
├── README.md                           # This file
├── CLAUDE.md                           # Claude Code instructions
├── package.json                        # Node.js dependencies
├── tsconfig.json                       # TypeScript configuration
├── .env.example                        # Environment template
│
├── src/
│   └── utils/
│       ├── client.ts                   # Anthropic client factory
│       └── logger.ts                   # Colorful logging utility
│
├── segment_1_fundamentals/             # Claude Architecture & Context
│   ├── 01_context_window_demo.ts       # 200K context in action
│   ├── 02_streaming_responses.ts       # Streaming patterns
│   ├── 03_tool_use.ts                  # Function calling (tools)
│   └── 04_mcp_intro.ts                 # MCP concepts
│
├── segment_2_claude_code/              # Claude Code CLI Deep Dive
│   ├── 01_installation.md              # Setup and configuration
│   ├── 02_code_review_workflow.ts      # Code review, testing, deployment
│   ├── 03_legacy_refactoring.ts        # Refactoring with Claude
│   └── 04_git_hooks.ts                 # Automated PR reviews
│
├── segment_3_mcp/                      # MCP Servers & Integration
│   ├── 01_mcp_architecture.ts          # Understanding MCP protocol
│   ├── 02_json_memory_server/          # Demo: Persistent JSON storage
│   │   ├── server.ts
│   │   └── README.md
│   ├── 03_github_integration.ts        # Connecting to GitHub
│   ├── 04_slack_integration.ts         # Connecting to Slack
│   └── 05_security_considerations.md   # Enterprise deployment
│
├── segment_4_production/               # Production Workflows
│   ├── 01_github_actions.yml           # CI/CD with Claude API
│   ├── 02_documentation_pipeline.ts    # Auto-generate docs
│   ├── 03_code_review_bot.ts           # Claude-powered PR reviews
│   ├── 04_cost_optimization.md         # When to use Claude vs alternatives
│   └── 05_team_adoption.md             # Pilot → training → scale playbook
│
├── mcp_servers/
│   └── memory/                         # Production MCP memory server
│       ├── src/index.ts
│       ├── package.json
│       └── README.md
│
├── scripts/
│   ├── verify-setup.ts                 # Verify installation
│   ├── claude-review.ts                # Claude code review
│   ├── generate-release-notes.ts       # Release notes generator
│   ├── security-scan.ts                # Security scanning
│   └── check-docs.ts                   # Documentation checker
│
└── docs/
    ├── SETUP.md                        # Detailed setup guide
    ├── TROUBLESHOOTING.md              # Common issues
    └── MCP_REFERENCE.md                # MCP quick reference
```

## Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/timothywarner-org/claude-code.git
   cd claude-code
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY
   ```

4. **Verify setup**

   ```bash
   npx tsx scripts/verify-setup.ts
   ```

5. **Run your first example**

   ```bash
   npx tsx segment_1_fundamentals/01_context_window_demo.ts
   ```

## Segment Summaries

### Segment 1: Claude Fundamentals & Unique Architecture

**Scenario:** Understand what makes Claude's context capabilities unique

**What you'll learn:**

- Claude's constitutional AI and why it matters for code safety
- 200K context window—analyzing entire codebases at once
- Streaming responses for better user experience
- Tool use (function calling) and agentic patterns
- Introduction to Model Context Protocol (MCP)

**Skills:** Large-context analysis, streaming, tool use, MCP basics

---

### Segment 2: Claude Code CLI Deep Dive

**Scenario:** Master terminal-first AI-assisted development

**What you'll learn:**

- Installing and configuring Claude Code CLI
- Terminal workflows: code review, testing, deployment
- Refactoring legacy codebases with Claude Code
- Integration with git hooks for automated PR reviews

**Skills:** Claude Code CLI, terminal workflows, git integration

---

### Segment 3: MCP Servers & Advanced Integration

**Scenario:** Build persistent memory that survives sessions

**What you'll learn:**

- Understanding Model Context Protocol architecture
- Building a JSON-based MCP memory server
- Connecting Claude to GitHub, Slack, and internal APIs
- Security considerations for enterprise deployment

**Skills:** MCP servers, tool integration, persistent memory patterns

---

### Segment 4: Production Workflows & Enterprise Strategy

**Scenario:** Deploy Claude-powered workflows at scale

**What you'll learn:**

- CI/CD integration with GitHub Actions and Claude API
- Documentation generation pipeline
- Building a Claude-powered code review bot
- Cost optimization: when to use Claude vs other tools
- Team adoption playbook: pilot → training → scale

**Skills:** CI/CD integration, cost management, enterprise deployment

## Key Code Examples

### 200K Context: Full Codebase Analysis

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

const client = new Anthropic();

// Load entire codebase into context
const fullCodebase = readFileSync('codebase_dump.txt', 'utf-8');  // ~150K tokens

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  messages: [{
    role: 'user',
    content: `Analyze this codebase and identify:
1. Architecture patterns used
2. Potential security vulnerabilities
3. Areas needing refactoring

${fullCodebase}`
  }]
});
```

### MCP Memory Server: Persistent Project Context

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({ name: 'project-memory', version: '1.0.0' });

// Store project knowledge that persists across sessions
server.tool(
  'remember_decision',
  'Store an architectural decision',
  {
    title: z.string(),
    description: z.string(),
    rationale: z.string(),
  },
  async ({ title, description, rationale }) => {
    // Save to persistent storage
    saveDecision({ title, description, rationale, date: new Date() });
    return { content: [{ type: 'text', text: `Remembered: ${title}` }] };
  }
);

server.tool(
  'recall_decisions',
  'Recall past decisions',
  { topic: z.string() },
  async ({ topic }) => {
    const relevant = findDecisions(topic);
    return { content: [{ type: 'text', text: JSON.stringify(relevant, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Claude Code: Git Hook Integration

```typescript
#!/usr/bin/env npx tsx
import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';

function getStagedDiff(): string {
  return execSync('git diff --cached', { encoding: 'utf-8' });
}

async function reviewWithClaude(diff: string): Promise<string> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Review this diff for security issues, performance concerns, and code style:

${diff}`
    }]
  });
  return response.content[0].type === 'text' ? response.content[0].text : '';
}

const diff = getStagedDiff();
if (diff) {
  const review = await reviewWithClaude(diff);
  console.log(review);
}
```

## Claude vs Copilot: When to Use Each

| Use Case | Claude | Copilot | Why |
|----------|--------|---------|-----|
| Full codebase analysis | **Yes** | No | 200K context vs ~8K |
| Persistent project memory | **Yes** (MCP) | No | MCP servers maintain state |
| Line-by-line autocomplete | No | **Yes** | Copilot optimized for inline |
| Complex refactoring | **Yes** | Limited | Claude reasons across files |
| Documentation generation | **Yes** | Limited | Rich structured output |

## Course Schedule

| Time | Activity |
|------|----------|
| 0:00 - 0:50 | Segment 1: Claude Fundamentals & Unique Architecture |
| 0:50 - 1:00 | Q&A + Break |
| 1:00 - 1:50 | Segment 2: Claude Code CLI Deep Dive |
| 1:50 - 2:00 | Q&A + Break |
| 2:00 - 2:50 | Segment 3: MCP Servers & Advanced Integration |
| 2:50 - 3:00 | Q&A + Break |
| 3:00 - 3:50 | Segment 4: Production Workflows & Enterprise Strategy |
| 3:50 - 4:00 | Wrap-up, resources, next steps |

## Learning Resources

### Claude Documentation

- [Claude Documentation](https://docs.anthropic.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)
- [Anthropic API Reference](https://docs.anthropic.com/en/api)

### Related O'Reilly Content

- [How to Prompt Like a Pro](https://learning.oreilly.com/search/?q=tim%20warner%2C%20how%20to%20prompt%20like%20a%20pro&type=live-course) — Tim Warner
- [GitHub Copilot for Developers](https://www.oreilly.com/library/view/github-copilot-for/9780135382813/) — Tim Warner
- [Prompt Engineering for Generative AI](https://www.oreilly.com/library/view/prompt-engineering-for/9781098153427/) — James Phoenix & Mike Taylor

## Troubleshooting

See [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues.

**Quick fixes:**

```bash
# API key issues
echo $ANTHROPIC_API_KEY  # Verify it's set

# Claude Code not found
npm install -g @anthropic-ai/claude-code

# MCP server won't start
cd mcp_servers/memory && npm run dev

# Dependency issues
rm -rf node_modules && npm install
```

## Instructor

**Tim Warner** — Microsoft MVP (Azure AI and Cloud/Datacenter Management), Microsoft Certified Trainer (25+ years)

- [LinkedIn](https://www.linkedin.com/in/intrepidtechie/)
- [Website](https://techtrainertim.com/)
- [O'Reilly Author Page](https://learning.oreilly.com/search/?query=Tim%20Warner)

## License

MIT License - See [LICENSE](./LICENSE) for details.

---

**Questions?** Open an issue or reach out via the course chat during live sessions.
