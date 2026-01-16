# Python Memory Server

A production-ready FastMCP server demonstrating all MCP primitives in Python. This is the Python equivalent of the TypeScript memory server, designed for teaching MCP concepts.

## Features

- **9 Tools** for storing and retrieving decisions, conventions, notes, and context
- **6 Resources** for direct data access (including dynamic URI templates)
- **4 Prompts** for common workflow templates
- **Persistent Storage** via JSON file
- **Async-First Design** with proper lifespan management
- **Type Safety** with Pydantic models

## Installation

```bash
# Install dependencies
pip install fastmcp pydantic

# Or add to requirements.txt
echo "fastmcp>=2.0.0" >> requirements.txt
echo "pydantic>=2.0.0" >> requirements.txt
```

## Usage

### Run Standalone

```bash
python segment_2_mcp/python_memory_server/server.py
```

### Add to Claude Code

```bash
claude mcp add python-memory -- python segment_2_mcp/python_memory_server/server.py
```

### With Custom Storage Path

```bash
MCP_MEMORY_PATH=./my-memory.json python segment_2_mcp/python_memory_server/server.py
```

## Tools Reference

| Tool | Description |
|------|-------------|
| `remember_decision` | Store an architectural decision |
| `recall_decisions` | Search past decisions |
| `add_convention` | Record a coding convention |
| `get_conventions` | List conventions by category |
| `add_note` | Save a general note |
| `search_notes` | Search through notes |
| `set_context` | Store key-value context |
| `get_context` | Retrieve context |
| `memory_summary` | Get counts of all items |

## Resources Reference

| URI | Description |
|-----|-------------|
| `memory://decisions` | All decisions as JSON |
| `memory://conventions` | All conventions as JSON |
| `memory://notes` | All notes as JSON |
| `memory://context` | Context key-value store |
| `memory://decisions/{id}` | Single decision by ID |
| `memory://notes/{id}` | Single note by ID |

## Prompts Reference

| Prompt | Description |
|--------|-------------|
| `decision_template` | ADR-style decision analysis |
| `convention_template` | New convention proposal |
| `context_review` | Memory review and insights |
| `onboarding_guide` | New team member onboarding |

## Example Usage

```python
# Store a decision
remember_decision(
    title="Use FastMCP for Python servers",
    description="Chose FastMCP over raw MCP SDK",
    rationale="Decorator-based API, automatic schema generation, better DX",
    tags=["architecture", "mcp", "python"]
)

# Add a convention
add_convention(
    name="Use Pydantic for data models",
    description="All data models should use Pydantic BaseModel",
    examples=["class User(BaseModel):\n    name: str\n    age: int"],
    category="typing"
)

# Query decisions
recall_decisions(query="FastMCP", limit=5)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Python Memory Server                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │  TOOLS   │  │RESOURCES │  │ PROMPTS  │                       │
│  │ (9 funcs)│  │ (6 URIs) │  │(4 tmpls) │                       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                       │
│       │             │             │                              │
│       └─────────────┼─────────────┘                              │
│                     │                                            │
│              ┌──────┴──────┐                                     │
│              │  AppState   │                                     │
│              │  (Memory)   │                                     │
│              └──────┬──────┘                                     │
│                     │                                            │
│              ┌──────┴──────┐                                     │
│              │  Lifespan   │                                     │
│              │ (Load/Save) │                                     │
│              └──────┬──────┘                                     │
│                     │                                            │
│              ┌──────┴──────┐                                     │
│              │   JSON File │                                     │
│              └─────────────┘                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Concepts Demonstrated

### 1. Lifespan Management

```python
@asynccontextmanager
async def lifespan(server: FastMCP):
    # Setup: Load data
    memory = load_memory(MEMORY_PATH)
    yield AppState(memory=memory)
    # Teardown: Save data
    save_memory(memory, MEMORY_PATH)
```

### 2. Context Injection

```python
@mcp.tool
async def my_tool(ctx: Context, param: str) -> str:
    state: AppState = ctx.state  # Access lifespan state
    return state.memory.context.get(param)
```

### 3. Dynamic Resources

```python
@mcp.resource("memory://decisions/{decision_id}")
async def get_decision(ctx: Context, decision_id: str) -> str:
    # {decision_id} is extracted from the URI
    ...
```

### 4. Typed Prompts

```python
@mcp.prompt(name="my_prompt", tags={"category"})
def my_prompt(param: str = PydanticField(description="...")) -> str:
    return f"Do something with {param}"
```

## Comparison with TypeScript Version

| Feature | TypeScript | Python |
|---------|------------|--------|
| Framework | @modelcontextprotocol/sdk | FastMCP |
| Validation | Zod | Pydantic |
| Transport | StdioServerTransport | Built-in |
| Async | Promises | async/await |
| State | Module-level | Lifespan context |

## Testing

```python
import pytest
from fastmcp import Client
from server import mcp

@pytest.mark.asyncio
async def test_remember_decision():
    async with Client(mcp) as client:
        result = await client.call_tool("remember_decision", {
            "title": "Test Decision",
            "description": "Testing the tool",
            "rationale": "For testing purposes"
        })
        assert "recorded" in result.lower()
```

## Troubleshooting

### Server won't start
- Check Python version (3.10+ required)
- Verify fastmcp is installed: `pip show fastmcp`
- Check for syntax errors: `python -m py_compile server.py`

### Memory not persisting
- Check write permissions for storage path
- Verify `MCP_MEMORY_PATH` is set correctly
- Look for errors in stderr output

### Tools not appearing in Claude
- Restart Claude Code after adding server
- Check `claude mcp list` for server status
- Verify server starts without errors

## Learn More

- [FastMCP Documentation](https://gofastmcp.com)
- [MCP Specification](https://modelcontextprotocol.io/specification)
- [Anthropic MCP Course](https://anthropic.skilljar.com/introduction-to-model-context-protocol)
