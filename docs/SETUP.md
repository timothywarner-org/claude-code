# Setup Guide

Complete setup instructions for the Claude Code course environment.

## Prerequisites

Before starting, ensure you have:

- **Node.js 20+** - [Download](https://nodejs.org/)
- **npm 10+** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)
- **Anthropic API Key** - [Get one](https://console.anthropic.com/)

## Quick Setup

```bash
# Clone the repository
git clone https://github.com/timothywarner-org/claude-code.git
cd claude-code

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Verify setup
npx tsx scripts/verify-setup.ts
```

## Step-by-Step Setup

### 1. Install Node.js

#### macOS (Homebrew)

```bash
brew install node@20
```

#### Windows (Chocolatey)

```powershell
choco install nodejs --version=20.0.0
```

#### Linux (nvm)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

### 2. Get Your API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-`)

### 3. Configure Environment

```bash
# Create .env file
cp .env.example .env

# Edit the file
# Set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Security Note:** Never commit your `.env` file. It's already in `.gitignore`.

### 4. Install Claude Code CLI (Optional)

The Claude Code CLI provides an interactive coding assistant:

```bash
# Install globally
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version

# Run first time setup
claude
```

### 5. Configure MCP Servers (Optional)

The project-scoped MCP servers (`microsoft-learn`, `DocumentMCP-ClaudeCode`, `github`) are already declared in **`.mcp.json`** at the repo root. The CLI reads them on first `claude` launch and prompts you to approve them once. No manual setup required to consume them in Segment 4.

To build and register your own memory server (optional Segment 4 homework, Python/UV):

```bash
# The memory server is a Python FastMCP server managed by UV
cd segment_4_hero/memory_server
uv sync

# Register with Claude Code
claude mcp add memory -- bash segment_4_hero/memory_server/start.sh
```

## IDE Setup

### VS Code

Install recommended extensions:

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
```

### Cursor

Cursor works out of the box with TypeScript. No additional setup needed.

### JetBrains IDEs

1. Open the project
2. Trust the project when prompted
3. Let WebStorm/IntelliJ index the project

## Running Examples

Demos run via `npx tsx` (JIT compilation). There is no root `tsconfig.json` and no `npm run build` step in this course.

```bash
# Segment 1: Zero (Install, CLI, First CLAUDE.md)
npx tsx segment_1_quickstart/02_verify_setup.ts
npx tsx segment_1_quickstart/03_terminal_workflows.ts
# See segment_1_quickstart/01_installation.md for CLI install

# Segment 2: Context (The CLAUDE.md Hierarchy)
# No TypeScript demos. The lesson is markdown and live demos:
#   segment_2_context/01_claude_md_at_every_scope.md

# Segment 3: Agents (The Loop, Permissions, Subagents)
npx tsx segment_3_agents/02_agent_loop.ts
npx tsx segment_3_agents/03_agent_boundaries.ts

# Segment 4: Hero (Skills, Subagents, and MCP)
npx tsx segment_4_hero/02_production_workflows.ts
npx tsx segment_4_hero/02_mcp_architecture.ts
# Optional memory server: see segment_4_hero/memory_server/README.md
```

## Verify Everything Works

Run the verification script:

```bash
npx tsx scripts/verify-setup.ts
```

You should see the core environment checks pass:

```
🔍 Claude Code Course - Environment Check

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Node.js Version      Node.js v20.x.x (>= 20 required)
✅ npm Version          npm 10.x.x
✅ TypeScript           Version 5.x.x
✅ ANTHROPIC_API_KEY    API key configured (sk-ant-***)
✅ Claude Code CLI      Installed: x.x.x
✅ Git                  git version x.x.x
✅ Dependencies         All dependencies installed
✅ package.json         Valid configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Note:** This course has no root `tsconfig.json` on purpose. Demos run via `npx tsx` (JIT compilation), so there is no `npm run build` step. If the verify script reports a `tsconfig.json` check, treat it as informational, not a blocker for the course workflow.

## Troubleshooting

If setup fails, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

## Cost Considerations

Running these examples uses the Anthropic API and incurs costs:

| Activity | Estimated Cost |
|----------|---------------|
| Running all Segment 1 examples | ~$0.10 |
| Running all Segment 2 examples | ~$0.15 |
| Running all Segment 3 examples | ~$0.10 |
| Running all Segment 4 examples | ~$0.20 |
| **Total course** | **~$0.55** |

These estimates are approximate and predate the current Sonnet 5 / Opus 4.8 / Haiku 4.5 lineup. Verify current per-token rates at [anthropic.com/pricing](https://www.anthropic.com/pricing) before budgeting.

Monitor your usage at [console.anthropic.com](https://console.anthropic.com/).
