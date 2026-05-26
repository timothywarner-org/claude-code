# Common MCP Server Patterns

Production-ready patterns for Python MCP servers.

## Table of Contents

1. [Database Connections](#database-connections)
2. [HTTP API Clients](#http-api-clients)
3. [File-Based Storage](#file-based-storage)
4. [Caching](#caching)
5. [Error Handling](#error-handling)
6. [Authentication](#authentication)
7. [Rate Limiting](#rate-limiting)
8. [Logging](#logging)

---

## Database Connections

### PostgreSQL with asyncpg

```python
from contextlib import asynccontextmanager
from dataclasses import dataclass
import asyncpg

@dataclass
class AppState:
    db_pool: asyncpg.Pool

@asynccontextmanager
async def lifespan(server: FastMCP):
    pool = await asyncpg.create_pool(
        host="localhost",
        database="mydb",
        user="user",
        password="password",
        min_size=5,
        max_size=20
    )
    yield AppState(db_pool=pool)
    await pool.close()

mcp = FastMCP("db-server", lifespan=lifespan)

@mcp.tool
async def query_users(ctx: Context, limit: int = 10) -> list[dict]:
    """Query users from database."""
    rows = await ctx.state.db_pool.fetch(
        "SELECT * FROM users LIMIT $1", limit
    )
    return [dict(row) for row in rows]
```

### SQLite (Sync)

```python
import sqlite3
from pathlib import Path

DB_PATH = Path("./data/app.db")

def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@mcp.tool
def query_items(query: str) -> list[dict]:
    """Search items in database."""
    with get_connection() as conn:
        cursor = conn.execute(
            "SELECT * FROM items WHERE name LIKE ?",
            (f"%{query}%",)
        )
        return [dict(row) for row in cursor.fetchall()]
```

---

## HTTP API Clients

### Persistent Client with Lifespan

```python
import httpx

@dataclass
class AppState:
    http: httpx.AsyncClient

@asynccontextmanager
async def lifespan(server: FastMCP):
    client = httpx.AsyncClient(
        base_url="https://api.example.com",
        headers={"Authorization": f"Bearer {API_KEY}"},
        timeout=30.0
    )
    yield AppState(http=client)
    await client.aclose()

@mcp.tool
async def fetch_data(ctx: Context, endpoint: str) -> dict:
    """Fetch data from API."""
    response = await ctx.state.http.get(endpoint)
    response.raise_for_status()
    return response.json()
```

### One-Off Requests

```python
import httpx
from fastmcp.exceptions import ToolError

@mcp.tool
async def fetch_url(url: str) -> dict:
    """Fetch JSON from any URL."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException:
        raise ToolError(f"Request timed out: {url}")
    except httpx.HTTPStatusError as e:
        raise ToolError(f"HTTP {e.response.status_code}: {e.response.text}")
```

---

## File-Based Storage

### JSON File Storage

```python
from pathlib import Path
from pydantic import BaseModel
import json

STORAGE_PATH = Path(os.environ.get("DATA_PATH", "./data/storage.json"))

class Storage(BaseModel):
    items: list[dict] = []
    metadata: dict[str, str] = {}

def load_storage() -> Storage:
    if STORAGE_PATH.exists():
        return Storage.model_validate_json(STORAGE_PATH.read_text())
    return Storage()

def save_storage(storage: Storage) -> None:
    STORAGE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STORAGE_PATH.write_text(storage.model_dump_json(indent=2))

# Use in lifespan
@asynccontextmanager
async def lifespan(server: FastMCP):
    storage = load_storage()
    yield AppState(storage=storage)
    save_storage(storage)
```

### Atomic File Writes

```python
import tempfile
import shutil

def atomic_write(path: Path, content: str) -> None:
    """Write file atomically to prevent corruption."""
    path.parent.mkdir(parents=True, exist_ok=True)

    # Write to temp file first
    fd, tmp_path = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as f:
            f.write(content)
        # Atomic rename
        shutil.move(tmp_path, path)
    except:
        os.unlink(tmp_path)
        raise
```

---

## Caching

### Simple In-Memory Cache

```python
from datetime import datetime, timedelta
from dataclasses import dataclass, field

@dataclass
class CacheEntry:
    value: Any
    expires: datetime

@dataclass
class AppState:
    cache: dict[str, CacheEntry] = field(default_factory=dict)

def get_cached(state: AppState, key: str) -> Any | None:
    entry = state.cache.get(key)
    if entry and entry.expires > datetime.now():
        return entry.value
    return None

def set_cached(state: AppState, key: str, value: Any, ttl_seconds: int = 300):
    state.cache[key] = CacheEntry(
        value=value,
        expires=datetime.now() + timedelta(seconds=ttl_seconds)
    )

@mcp.tool
async def get_data(ctx: Context, key: str) -> dict:
    """Get data with caching."""
    cached = get_cached(ctx.state, key)
    if cached:
        return cached

    # Fetch fresh data
    data = await fetch_from_source(key)
    set_cached(ctx.state, key, data)
    return data
```

---

## Error Handling

### Comprehensive Error Wrapper

```python
from fastmcp.exceptions import ToolError
import traceback
import sys

def handle_errors(func):
    """Decorator for consistent error handling."""
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except ToolError:
            raise  # Re-raise MCP errors as-is
        except ValueError as e:
            raise ToolError(f"Invalid input: {e}")
        except FileNotFoundError as e:
            raise ToolError(f"File not found: {e}")
        except Exception as e:
            # Log unexpected errors
            print(f"Unexpected error: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            raise ToolError(f"Internal error: {type(e).__name__}")
    return wrapper

@mcp.tool
@handle_errors
async def risky_operation(param: str) -> dict:
    """Operation that might fail."""
    # Implementation
    pass
```

### Validation Pattern

```python
@mcp.tool
def process_data(
    data: str = Field(description="JSON data to process")
) -> dict:
    """Process JSON data."""
    # Validate input
    try:
        parsed = json.loads(data)
    except json.JSONDecodeError as e:
        raise ToolError(f"Invalid JSON: {e}")

    # Validate structure
    if not isinstance(parsed, dict):
        raise ToolError("Expected JSON object, got array")

    if "required_field" not in parsed:
        raise ToolError("Missing required field: 'required_field'")

    # Process
    return {"processed": True, "data": parsed}
```

---

## Authentication

### Bearer Token Auth

```python
from fastmcp.server.auth import BearerTokenProvider

# Simple token auth
auth = BearerTokenProvider(
    tokens={
        "secret-token-123": {"user": "admin", "role": "admin"},
        "reader-token-456": {"user": "reader", "role": "readonly"}
    }
)

mcp = FastMCP("secure-server", auth=auth)
```

### Environment-Based Secrets

```python
import os

def get_required_env(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise ValueError(f"Required environment variable not set: {key}")
    return value

API_KEY = get_required_env("API_KEY")
DB_PASSWORD = get_required_env("DB_PASSWORD")
```

---

## Rate Limiting

### Simple Rate Limiter

```python
from datetime import datetime
from collections import defaultdict

@dataclass
class RateLimiter:
    requests: dict[str, list[datetime]] = field(default_factory=lambda: defaultdict(list))
    max_requests: int = 100
    window_seconds: int = 60

    def check(self, key: str) -> bool:
        now = datetime.now()
        cutoff = now - timedelta(seconds=self.window_seconds)

        # Remove old requests
        self.requests[key] = [t for t in self.requests[key] if t > cutoff]

        # Check limit
        if len(self.requests[key]) >= self.max_requests:
            return False

        self.requests[key].append(now)
        return True

@mcp.tool
async def rate_limited_tool(ctx: Context, param: str) -> str:
    """Tool with rate limiting."""
    if not ctx.state.rate_limiter.check("default"):
        raise ToolError("Rate limit exceeded. Try again later.")

    return await do_work(param)
```

---

## Logging

### Structured Logging

```python
import sys
import json
from datetime import datetime

def log(level: str, message: str, **kwargs):
    """Log to stderr in JSON format."""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "level": level,
        "message": message,
        **kwargs
    }
    print(json.dumps(entry), file=sys.stderr)

def log_info(message: str, **kwargs):
    log("INFO", message, **kwargs)

def log_error(message: str, **kwargs):
    log("ERROR", message, **kwargs)

def log_warning(message: str, **kwargs):
    log("WARNING", message, **kwargs)

# Usage in tools
@mcp.tool
async def logged_operation(param: str) -> dict:
    """Operation with logging."""
    log_info("Starting operation", param=param)
    try:
        result = await do_work(param)
        log_info("Operation complete", result_size=len(result))
        return result
    except Exception as e:
        log_error("Operation failed", error=str(e))
        raise
```
