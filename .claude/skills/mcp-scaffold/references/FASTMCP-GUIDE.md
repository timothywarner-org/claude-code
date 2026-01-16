# FastMCP API Reference

Complete reference for the FastMCP Python framework.

## Table of Contents

1. [Server Initialization](#server-initialization)
2. [Tools](#tools)
3. [Resources](#resources)
4. [Prompts](#prompts)
5. [Context and State](#context-and-state)
6. [Lifespan Management](#lifespan-management)
7. [Type Hints and Validation](#type-hints-and-validation)

---

## Server Initialization

```python
from fastmcp import FastMCP

# Basic initialization
mcp = FastMCP("server-name")

# With version and description
mcp = FastMCP(
    name="server-name",
    version="1.0.0",
    description="What this server does"
)

# With lifespan for state management
mcp = FastMCP("server-name", lifespan=my_lifespan)

# Run the server
if __name__ == "__main__":
    mcp.run()  # stdio transport (default)
```

---

## Tools

Tools are actions the LLM can execute.

### Basic Tool

```python
@mcp.tool
def add(a: int, b: int) -> int:
    """Add two numbers together."""
    return a + b
```

### Tool with Field Descriptions

```python
from pydantic import Field

@mcp.tool
def search(
    query: str = Field(description="Search query string"),
    limit: int = Field(default=10, ge=1, le=100, description="Max results"),
    include_metadata: bool = Field(default=False, description="Include extra info")
) -> list[dict]:
    """Search the database for matching records."""
    # Implementation
    return results
```

### Async Tool

```python
@mcp.tool
async def fetch_data(url: str) -> dict:
    """Fetch JSON data from a URL."""
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()
```

### Tool with Context

```python
from fastmcp import Context

@mcp.tool
async def db_query(ctx: Context, sql: str) -> list[dict]:
    """Execute a database query."""
    # Access lifespan state
    pool = ctx.state.db_pool
    rows = await pool.fetch(sql)
    return [dict(row) for row in rows]
```

### Tool Error Handling

```python
from fastmcp.exceptions import ToolError

@mcp.tool
def divide(a: float, b: float) -> float:
    """Divide a by b."""
    if b == 0:
        raise ToolError("Cannot divide by zero")
    return a / b
```

---

## Resources

Resources expose data the LLM can read.

### Static Resource

```python
@mcp.resource("config://settings")
def get_settings() -> str:
    """Application configuration."""
    return json.dumps({"debug": True, "version": "1.0"})
```

### Dynamic Resource (URI Template)

```python
@mcp.resource("users://{user_id}/profile")
def get_user(user_id: str) -> str:
    """Get user profile by ID."""
    user = database.get_user(user_id)
    return json.dumps(user)
```

### Resource with Multiple Parameters

```python
@mcp.resource("repos://{owner}/{repo}/info")
def get_repo(owner: str, repo: str) -> dict:
    """Get repository information."""
    return {"owner": owner, "name": repo, "full_name": f"{owner}/{repo}"}
```

### Resource with Annotations

```python
@mcp.resource(
    "data://readonly",
    annotations={
        "readOnlyHint": True,
        "idempotentHint": True
    }
)
def readonly_data() -> str:
    """Read-only data source."""
    return json.dumps(data)
```

### Async Resource with Context

```python
@mcp.resource("db://users")
async def all_users(ctx: Context) -> str:
    """All users from database."""
    pool = ctx.state.db_pool
    users = await pool.fetch("SELECT * FROM users")
    return json.dumps([dict(u) for u in users])
```

---

## Prompts

Prompts are reusable message templates.

### Basic Prompt

```python
@mcp.prompt
def summarize(text: str) -> str:
    """Generate a summary request."""
    return f"Please summarize the following text:\n\n{text}"
```

### Prompt with Metadata

```python
@mcp.prompt(
    name="code_review",
    description="Request a code review",
    tags={"development", "review"}
)
def code_review(
    code: str = Field(description="Code to review"),
    language: str = Field(default="python", description="Programming language"),
    focus: str = Field(default="general", description="Review focus area")
) -> str:
    """Generate a code review request."""
    return f"""Please review this {language} code with focus on {focus}:

```{language}
{code}
```

Provide specific, actionable feedback."""
```

### Prompt with Default Values

```python
@mcp.prompt
def analyze_data(
    data_uri: str = Field(description="URI of data to analyze"),
    analysis_type: str = Field(default="summary", description="Type: summary, trends, anomalies")
) -> str:
    """Request data analysis."""
    return f"Perform a '{analysis_type}' analysis on data at {data_uri}."
```

---

## Context and State

Access server state and capabilities via Context.

### Accessing State

```python
from fastmcp import Context

@mcp.tool
async def my_tool(ctx: Context, param: str) -> str:
    # Access lifespan state
    db = ctx.state.database
    cache = ctx.state.cache

    # Use state
    result = await db.query(param)
    return result
```

### Context Capabilities

```python
@mcp.tool
async def advanced_tool(ctx: Context) -> str:
    # Logging (goes to MCP client)
    ctx.log.info("Processing request...")
    ctx.log.warning("This might take a while")

    # Progress reporting
    ctx.progress.update(0.5, message="Halfway done")

    return "Complete"
```

---

## Lifespan Management

Manage server startup and shutdown.

### Basic Lifespan

```python
from contextlib import asynccontextmanager
from dataclasses import dataclass

@dataclass
class AppState:
    db_pool: asyncpg.Pool
    http_client: httpx.AsyncClient

@asynccontextmanager
async def lifespan(server: FastMCP):
    # Startup
    pool = await asyncpg.create_pool("postgresql://localhost/db")
    client = httpx.AsyncClient()

    # Yield state to tools
    yield AppState(db_pool=pool, http_client=client)

    # Shutdown
    await pool.close()
    await client.aclose()

mcp = FastMCP("my-server", lifespan=lifespan)
```

### Lifespan with Error Handling

```python
@asynccontextmanager
async def lifespan(server: FastMCP):
    pool = None
    try:
        pool = await asyncpg.create_pool(DATABASE_URL)
        yield AppState(db_pool=pool)
    except Exception as e:
        print(f"Startup failed: {e}", file=sys.stderr)
        raise
    finally:
        if pool:
            await pool.close()
```

---

## Type Hints and Validation

FastMCP uses type hints for schema generation.

### Supported Types

```python
# Primitives
def tool1(s: str, i: int, f: float, b: bool) -> str: ...

# Optional
def tool2(s: str, opt: str | None = None) -> str: ...

# Lists
def tool3(items: list[str], numbers: list[int]) -> list[dict]: ...

# Dicts
def tool4(data: dict[str, Any]) -> dict: ...

# Pydantic Models
class User(BaseModel):
    name: str
    age: int

def tool5(user: User) -> User: ...
```

### Field Constraints

```python
from pydantic import Field

@mcp.tool
def constrained(
    # String constraints
    name: str = Field(min_length=1, max_length=100),

    # Numeric constraints
    age: int = Field(ge=0, le=150),
    score: float = Field(gt=0, lt=1.0),

    # Enum-like
    status: str = Field(pattern="^(active|inactive|pending)$"),

    # With default
    limit: int = Field(default=10, ge=1, le=100)
) -> dict: ...
```

### Return Types

```python
# String (most common)
@mcp.tool
def tool1() -> str:
    return "result"

# Dict (auto-serialized to JSON)
@mcp.tool
def tool2() -> dict:
    return {"key": "value"}

# List
@mcp.tool
def tool3() -> list[dict]:
    return [{"id": 1}, {"id": 2}]

# Pydantic Model
@mcp.tool
def tool4() -> User:
    return User(name="Alice", age=30)
```
