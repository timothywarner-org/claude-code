---
name: mcp-scaffold
description: Scaffold production-ready Python MCP servers using FastMCP. Use when creating new MCP servers, initializing MCP projects, generating server boilerplate, or setting up MCP development environments. Supports all MCP primitives (tools, resources, prompts) with Pydantic validation, async patterns, and proper project structure.
---

# MCP Server Scaffolding

Scaffold production-ready Python MCP servers with FastMCP.

## Quick Start

Generate a new MCP server:

```bash
python scripts/scaffold.py my-server --output ./my-server
```

This creates a complete project structure with:
- `server.py` - Main server with example tool, resource, and prompt
- `requirements.txt` - Dependencies (fastmcp, pydantic)
- `README.md` - Usage instructions

## Scaffolding Options

### Minimal Server (Tools Only)

```bash
python scripts/scaffold.py my-server --template basic
```

### Full Server (All Primitives)

```bash
python scripts/scaffold.py my-server --template full
```

### With Specific Features

```bash
python scripts/scaffold.py my-server \
  --tools \
  --resources \
  --prompts \
  --lifespan \
  --output ./servers/my-server
```

## Validation

Validate an existing MCP server:

```bash
python scripts/validate.py path/to/server.py
```

Checks:
- FastMCP import and initialization
- Tool definitions with proper type hints
- Resource URI patterns
- Pydantic Field usage
- Async function patterns

## Project Structure

Generated projects follow this structure:

```
my-server/
├── server.py           # Main MCP server
├── requirements.txt    # Python dependencies
├── README.md          # Usage documentation
└── data/              # Default data directory (gitignored)
```

## Templates

### Basic Template

Minimal server with one tool:

```python
from fastmcp import FastMCP

mcp = FastMCP("my-server")

@mcp.tool
def hello(name: str) -> str:
    """Greet someone by name."""
    return f"Hello, {name}!"

if __name__ == "__main__":
    mcp.run()
```

### Full Template

Complete server with tools, resources, prompts, and lifespan. See [assets/templates/full-server.py](assets/templates/full-server.py).

## Reference Documentation

- **FastMCP API**: See [references/FASTMCP-GUIDE.md](references/FASTMCP-GUIDE.md) for decorator syntax, type hints, and patterns
- **Common Patterns**: See [references/PATTERNS.md](references/PATTERNS.md) for database connections, API clients, error handling
- **Deployment**: See [references/DEPLOYMENT.md](references/DEPLOYMENT.md) for stdio, HTTP, and Docker deployment

## MCP Primitives Cheatsheet

### Tools (Actions)

```python
from pydantic import Field

@mcp.tool
def my_tool(
    param: str = Field(description="Parameter description"),
    optional: int = Field(default=10, description="Optional with default")
) -> dict:
    """Tool description shown to LLM."""
    return {"result": param}
```

### Resources (Data)

```python
@mcp.resource("myscheme://path/to/resource")
def static_resource() -> str:
    """Resource description."""
    return json.dumps({"data": "value"})

@mcp.resource("myscheme://items/{item_id}")
def dynamic_resource(item_id: str) -> str:
    """Dynamic resource with URI template."""
    return json.dumps({"id": item_id})
```

### Prompts (Templates)

```python
@mcp.prompt(name="my_prompt", tags={"category"})
def my_prompt(
    topic: str = Field(description="What to analyze")
) -> str:
    """Prompt description."""
    return f"Please analyze {topic} and provide insights."
```

## Workflow

1. **Scaffold** - Generate project structure
2. **Customize** - Add your tools, resources, prompts
3. **Validate** - Check for common issues
4. **Test** - Run locally with `python server.py`
5. **Deploy** - Add to Claude Code with `claude mcp add`
