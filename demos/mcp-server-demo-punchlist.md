# MCP Memory Server Demo Punchlist

Live demo script for O'Reilly "Claude Code and Large-Context Reasoning" session.

**Prerequisites:**
- [ ] `.env` file in `src/` with `OPENAI_API_KEY` (for DeepSeek) and optionally `GITHUB_TOKEN`
- [ ] Python dependencies installed: `pip install fastmcp pydantic python-dotenv openai tiktoken`

---

## 1. Start the Memory Server

```bash
# From repo root
cd src
python memory_server.py
```

**Expected output:** Server starts silently (logs go to stderr, stdout reserved for JSON-RPC)

**If it fails:** Check that `api_utils.py` and `data/memory_items.json` exist in `src/`

---

## 2. Load MCP Inspector

Open a **new terminal** (keep server running):

```bash
# Install and run inspector
npx @modelcontextprotocol/inspector
```

**In browser (http://localhost:5173):**
- [ ] Click "Connect"
- [ ] Transport: `stdio`
- [ ] Command: `C:\github\claude-code\src\.venv\Scripts\python.exe`
- [ ] Args: `memory_server.py`

**Verify in Inspector:**
- [ ] **Tools tab:** Shows 12 tools (add_memory, get_memory, get_memory_summary, search_memory, get_optimized_memory, update_memory, delete_memory, list_by_tag, list_by_type, list_memories_brief, reset_memory, test_apis)
- [ ] **Resources tab:** Shows 4 resources (memory://items, memory://tags, memory://types, memory://stats)
- [ ] **Prompts tab:** Shows 4 prompts (code_review_context, refactoring_plan, mcp_tool_design, codebase_analysis)

---

## 3. Test Tools in Inspector

### Test 1: List all memories
```
Tool: search_memory
Parameters: { "search_term": "context" }
```
**Expected:** Returns mem-007 (200K Context Window patterns)

### Test 2: Get specific memory
```
Tool: get_memory
Parameters: { "memory_id": "mem-001" }
```
**Expected:** Returns MCP Memory Server schema design pattern

### Test 3: Test API connectivity
```
Tool: test_apis
Parameters: {}
```
**Expected:** Shows DeepSeek and GitHub connection status

### Test 4: List memories with token counts (NEW)
```
Tool: list_memories_brief
Parameters: {}
```
**Expected:** Returns all 10 memories with:
- `count`: 10
- `total_tokens`: ~7500
- Each memory: id, title, type, tags, token_count, has_summary: true

### Test 5: Get memory summary (NEW)
```
Tool: get_memory_summary
Parameters: { "memory_id": "mem-001" }
```
**Expected:** Returns ~40 tokens with:
- id, title, type, tags
- summary: "MCP server architecture guide covering tools/resources/prompts..."

**Teaching point:** Compare with `get_memory` which returns ~750 tokens!

---

## 4. Configure Claude Code (Project-Scoped)

### Create project MCP config

The `.mcp.json` file in the repo root configures the memory server using the venv Python:

```json
{
  "mcpServers": {
    "memory-server": {
      "command": "C:\\github\\claude-code\\src\\.venv\\Scripts\\python.exe",
      "args": ["memory_server.py"]
    }
  }
}
```

Or create via CLI:

```bash
# From repo root - creates .mcp.json for project scope
claude mcp add memory-server -s project -- C:\github\claude-code\src\.venv\Scripts\python.exe memory_server.py
```

### Verify configuration

```bash
# List configured servers
claude mcp list

# Should show:
# memory-server (project) C:\github\claude-code\src\.venv\Scripts\python.exe memory_server.py
```

### Test in Claude Code

```bash
# Start Claude Code
claude

# Once in session, test the connection:
> Use the memory server to search for "MCP" patterns
```

**Expected:** Claude calls `search_memory` and returns mem-001, mem-005, mem-008

---

## 5. Set and Retrieve Optimized Memories

### 5a. Add a new memory

In Claude Code session:
```
> Add a new memory to the server:
  - Title: "Demo Session Context"
  - Type: "note"
  - Content: "This is a live O'Reilly session demonstrating MCP memory servers
    for large-context management. Key concepts: persistent project knowledge,
    token optimization, cross-session continuity. The memory server stores
    conventions, decisions, and patterns that Claude can retrieve without
    re-explaining context each session."
  - Tags: ["demo", "mcp-server"]
  - Project: "oreilly-course"
```

**Expected:** Returns success with new ID (mem-011)

### 5b. Retrieve with token optimization

```
> Get the optimized version of mem-010 (the Capstone PRD) with max 1000 tokens
```

**Expected output shows:**
- Original content condensed
- Optimization metadata:
  - `original_tokens`: ~1800
  - `optimized_tokens`: ~1000
  - `reduction`: ~44%
  - Code snippets and configs preserved

### 5c. Compare raw vs optimized

```
> Show me mem-010 raw, then optimized to 800 tokens. Compare what was preserved vs removed.
```

**Teaching point:** DeepSeek preserves:
- Code blocks
- Commands
- Config values
- Technical terms

DeepSeek removes:
- Redundant explanations
- Conversational filler
- Unnecessary context

---

## 6. Token Efficiency Showdown (NEW)

**Goal:** Demonstrate the 3 levels of token efficiency

### 6a. Get token budget overview

In Claude Code session:
```
> Use list_memories_brief to show me all memories with their token counts
```

**Expected output:**
- 10 memories listed
- Total tokens: ~7500
- Each memory shows token_count (600-900 range)
- All show `has_summary: true`

### 6b. Compare retrieval methods

```
> For mem-001, show me three things:
  1. Just the summary (get_memory_summary)
  2. The DeepSeek-optimized version (max 300 tokens)
  3. The full content (get_memory)
  Compare the token counts.
```

**Expected comparison:**

| Method | Tokens | Content |
|--------|--------|---------|
| `get_memory_summary` | ~40 | id, title, type, tags, 1-sentence summary |
| `get_optimized_memory(300)` | ~300 | Condensed content, code preserved |
| `get_memory` | ~750 | Full verbose content |

**Teaching point:** Choose the right tool for your context budget:
- **Summary** → Quick decision: "Do I need this memory?"
- **Optimized** → Context injection with token budget
- **Full** → When you need everything

### 6c. Demonstrate context budget planning

```
> I have a 2000 token budget for context. Using list_memories_brief, which
  memories should I fetch to stay under budget while covering MCP architecture,
  troubleshooting, and tool patterns?
```

**Expected:** Claude uses token counts to select memories strategically

---

## Quick Recovery Commands

If something breaks:

```bash
# Reset memory to original state (in Claude Code)
> Reset the memory server to restore all original items

# Restart server
Ctrl+C  # kill server
python src/memory_server.py  # restart

# Check server logs (stderr)
python memory_server.py 2>&1 | tee server.log
```

---

## Demo Talking Points

1. **Why memory servers?** - Persist project context across sessions without re-explaining
2. **Three-tier token efficiency:**
   - `list_memories_brief` → Plan your token budget (shows counts)
   - `get_memory_summary` → Quick preview (~40 tokens)
   - `get_optimized_memory` → DeepSeek compression (configurable)
3. **Pre-computed summaries** - Each memory has a ~25 token summary, no API call needed
4. **Project-scoped config** - `.mcp.json` travels with repo, team shares same setup
5. **MCP primitives** - Tools (actions), Resources (read-only data), Prompts (templates)
6. **Large-context management** - Don't reload unchanged context; store and retrieve selectively
7. **Strategic retrieval** - Use token counts to fit memories within context budget

---

## Cleanup After Demo

```bash
# Remove test memory (in-memory only, doesn't affect JSON file)
> Delete memory mem-011

# Or reset everything
> Reset the memory server
```
