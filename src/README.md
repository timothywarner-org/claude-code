# Memory MCP Server

A FastMCP server for storing and retrieving project notes, PRDs, and code context with DeepSeek-powered optimization for token-efficient retrieval. Built for the "Claude Code with Large-Context Reasoning" course.

## Features

- 📝 **Memory Management** — Store notes, PRDs, code snippets, decisions, patterns, configs, and troubleshooting guides
- 🏷️ **Smart Tagging** — 7 predefined course-relevant tags for easy categorization
- 🔍 **Powerful Search** — Find memories by keyword, tag, type, or project
- 🤖 **DeepSeek Optimization** — Condense memories for token-efficient context injection
- 💾 **Intelligent Caching** — 1-hour TTL cache to avoid redundant API calls
- 🎯 **7 Memory Types** — Note, PRD, snippet, decision, pattern, config, troubleshooting
- 📊 **Statistics** — Track usage by tag, type, and project
- 🔌 **API Testing** — Built-in connectivity tests for DeepSeek and GitHub

## Quick Start

### 1. Setup Environment

```powershell
# Windows (PowerShell 7+)
cd src
pwsh .\setup.ps1
```

```bash
# macOS/Linux
cd src
chmod +x setup.sh
./setup.sh
```

This creates a `.venv` virtual environment and installs all dependencies including:
- `fastmcp` — FastMCP server framework
- `python-dotenv` — Environment variable loading
- `openai` — DeepSeek API client (OpenAI-compatible)
- `tiktoken` — Token counting
- `pydantic` — Data validation

### 2. Configure Environment Variables

The server loads API credentials from `.env` (already configured):

```env
# DeepSeek (OpenAI-compatible API)
OPENAI_API_KEY=your-deepseek-key
OPENAI_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat

# GitHub API
GITHUB_TOKEN=your-github-token
```

### 3. Run the Server

```bash
python memory_server.py
```

The server runs via stdio transport (standard MCP protocol).

### 4. Test with MCP Inspector

```bash
python start_inspector.py
```

Opens a web UI for interactive testing at `http://localhost:[random-port]`.

### 5. Run Tests

```bash
pytest test_memory_server.py -v
```

All tests should pass (includes mocked DeepSeek/GitHub API tests).

## Memory Server Features

### Resources

| Resource | Description |
|----------|-------------|
| `memory://items` | List all memory items with metadata |
| `memory://tags` | List available predefined tags |
| `memory://types` | List all 7 memory types |
| `memory://stats` | Statistics by type, tag, and project |

### Tools

| Tool | Parameters | Description |
|------|------------|-------------|
| `add_memory` | title, content, type, tags[], project | Create new memory |
| `get_memory` | memory_id | Retrieve specific memory |
| `search_memory` | search_term, tag?, type?, project? | Search with filters |
| `get_optimized_memory` | memory_id, max_tokens?, use_cache? | Get token-optimized memory |
| `update_memory` | memory_id, title?, content?, tags?, project? | Update existing memory |
| `delete_memory` | memory_id | Delete memory (in-memory) |
| `list_by_tag` | tag | Get all memories with tag |
| `list_by_type` | type | Get all memories of type |
| `reset_memory` | (none) | Restore deleted memories |
| `test_apis` | (none) | Test DeepSeek/GitHub connectivity |

### Prompts

| Prompt | Parameters | Description |
|--------|------------|-------------|
| `code_review_context` | language, framework?, conventions? | Generate code review context |
| `refactoring_plan` | language, target_issues? | Create refactoring plan |
| `mcp_tool_design` | tool_purpose, tool_name? | Design MCP tool |
| `codebase_analysis` | project_type, focus_areas? | Analyze complete codebase |

## DeepSeek Optimization

### How It Works

When you call `get_optimized_memory`, the server:

1. **Retrieves** the memory content
2. **Counts tokens** using tiktoken (cl100k_base encoding)
3. **Checks cache** for previously optimized version (1-hour TTL)
4. **Calls DeepSeek** to condense content if not cached
5. **Preserves** all technical details:
   - Code snippets (exact syntax)
   - Commands (exact syntax)
   - Config values (API keys, URLs, paths)
   - File names and paths
   - Numbers and version strings
6. **Removes** verbosity:
   - Redundant explanations
   - Conversational filler
   - Unnecessary context
7. **Falls back** to raw content if optimization fails

### Token Efficiency Example

```python
# Original memory: 2500 tokens
result = get_optimized_memory("mem-003", max_tokens=1500)

# Optimized: ~1450 tokens (42% reduction)
# All code blocks, commands, and configs preserved
# Technical accuracy maintained
```

### Cache Benefits

- **Avoids redundant API calls** for frequently accessed memories
- **Reduces cost** (DeepSeek charges per token)
- **Faster retrieval** (no API latency on cache hit)
- **1-hour TTL** ensures fresh content periodically

## Memory Types & Tags

### 7 Memory Types

1. **note** — General project notes and observations
2. **prd** — Product requirements documents and specifications
3. **snippet** — Code snippets and implementation examples
4. **decision** — Architecture decisions and technical choices
5. **pattern** — Design patterns and best practices
6. **config** — Configuration files and settings
7. **troubleshooting** — Error solutions and debugging guides

### 7 Predefined Tags

1. **mcp-server** — Model Context Protocol development
2. **claude-api** — Claude API usage and optimization
3. **tool-use** — Function calling and tool schemas
4. **context-window** — Large context strategies
5. **production-workflow** — CI/CD and automation
6. **debugging** — Troubleshooting and solutions
7. **cost-optimization** — Token budgets and efficiency

## Sample Data

The server includes 10 realistic course memories:

1. MCP Memory Server architecture patterns
2. PR Review Bot configuration
3. Legacy refactoring strategies
4. Cost management and model selection
5. MCP tool implementation patterns
6. GitHub Actions CI/CD workflows
7. Context window usage best practices
8. MCP server registration and debugging
9. Streaming response implementation
10. Capstone project requirements

## VS Code Integration

### Debug Configuration

Press `F5` and select "🚀 Run MCP Server" to debug.

### Tasks

`Ctrl+Shift+P` → "Tasks: Run Task" → choose:
- Setup Environment (pwsh/bash)
- Run Memory Server
- Test Memory Server
- Start Inspector

### Auto-Activate venv

VS Code automatically activates the venv in new terminals. If not:

1. `Ctrl+Shift+P` → "Python: Select Interpreter"
2. Choose `src/.venv/Scripts/python.exe`
3. Reload window

## Project Structure

```
src/
├── memory_server.py            # Main FastMCP server
├── api_utils.py                # DeepSeek & GitHub API clients
├── test_memory_server.py       # Pytest suite
├── start_inspector.py          # Inspector launcher
├── setup.ps1 / setup.sh        # Environment setup
├── pyproject.toml              # Python dependencies
├── .env                        # API credentials (gitignored)
├── README.md                   # This file
└── data/
    └── memory_items.json       # Memory database (10 samples)
```

## Usage Examples

### Adding a Memory

```python
add_memory(
    title="API Rate Limiting Strategy",
    content="Implement exponential backoff with jitter...",
    type="pattern",
    tags=["claude-api", "cost-optimization"],
    project="capstone"
)
```

### Searching Memories

```python
# Find all MCP-related memories
search_memory("tool registration", tag="mcp-server")

# Find troubleshooting guides
search_memory("error", type="troubleshooting")

# Find project-specific memories
search_memory("review", project="capstone")
```

### Optimized Retrieval

```python
# Get condensed version (default 1500 tokens)
get_optimized_memory("mem-007")

# Custom token budget
get_optimized_memory("mem-010", max_tokens=1000)

# Skip cache (force fresh optimization)
get_optimized_memory("mem-003", use_cache=False)
```

### Using Prompts

```python
# Generate code review context
code_review_context(
    language="python",
    framework="FastMCP",
    conventions="Use type hints, max 50 LOC per function"
)

# Create refactoring plan
refactoring_plan(
    language="typescript",
    target_issues="God class, missing error handling"
)
```

## API Connectivity Testing

Test DeepSeek and GitHub API connections:

```python
test_apis()
# Returns:
# {
#   "deepseek": {"connected": true, "message": "Connection successful"},
#   "github": {"connected": true, "message": "Connected as: username"},
#   "cache_stats": {"total_entries": 5, "avg_reduction": "45.2%"}
# }
```

## Troubleshooting

### "OPENAI_API_KEY not found"

Ensure `.env` file exists in `src/` directory with valid DeepSeek API key.

### "Module not found" errors

Run setup script to create venv and install dependencies:
```bash
pwsh ./setup.ps1  # Windows
./setup.sh        # macOS/Linux
```

### Optimization fails

Server falls back to raw content automatically. Check DeepSeek API status and key validity with `test_apis()` tool.

### Port already in use (Inspector)

`start_inspector.py` automatically finds an available port. If issues persist, close other inspector instances.

## Requirements

- Python 3.10+
- Node.js 18+ (for MCP Inspector)
- PowerShell 7+ (Windows) or Bash (Unix)
- DeepSeek API key (optional, optimization gracefully degrades)
- GitHub token (optional, for future integrations)

## Architecture

```
┌─────────────────┐     stdio      ┌──────────────────────┐
│  MCP Inspector  │◄──────────────►│   memory_server.py   │
│  (Web UI)       │                │   (FastMCP/Python)   │
└─────────────────┘                └──────────┬───────────┘
                                              │
                                   ┌──────────┴───────────┐
                                   │   api_utils.py       │
                                   │   ┌──────────────┐   │
                                   │   │ DeepSeekClient│   │
                                   │   │   + Cache    │   │
                                   │   └──────────────┘   │
                                   │   ┌──────────────┐   │
                                   │   │ GitHubClient │   │
                                   │   └──────────────┘   │
                                   └──────────┬───────────┘
                                              │
                                   ┌──────────▼───────────┐
                                   │  data/memory_items   │
                                   │  .json (10 samples)  │
                                   └──────────────────────┘
```

## License

MIT
