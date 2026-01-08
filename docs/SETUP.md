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
git clone https://github.com/timothywarner/claude-code.git
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

For Segment 3, you'll set up MCP servers:

```bash
# Add the memory server
cd mcp_servers/memory
npm install
npm run build

# Register with Claude Code
claude mcp add memory -- node /path/to/memory/dist/index.js
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

Each segment has runnable examples:

```bash
# Segment 1: Fundamentals
npx tsx segment_1_fundamentals/01_context_window_demo.ts
npx tsx segment_1_fundamentals/02_streaming_responses.ts
npx tsx segment_1_fundamentals/03_tool_use.ts

# Segment 2: Claude Code CLI
# See segment_2_claude_code/01_installation.md for CLI usage
npx tsx segment_2_claude_code/02_code_review_workflow.ts

# Segment 3: MCP Servers
npx tsx segment_3_mcp/01_mcp_architecture.ts
# Start memory server: see mcp_servers/memory/README.md

# Segment 4: Production
npx tsx segment_4_production/02_documentation_pipeline.ts
npx tsx segment_4_production/03_code_review_bot.ts
```

## Verify Everything Works

Run the verification script:

```bash
npx tsx scripts/verify-setup.ts
```

You should see all green checkmarks:

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
✅ tsconfig.json        TypeScript configured
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Results: 9 passed, 0 warnings, 0 failed

✅ All checks passed! Environment is ready for the course.
```

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

Monitor your usage at [console.anthropic.com](https://console.anthropic.com/).
