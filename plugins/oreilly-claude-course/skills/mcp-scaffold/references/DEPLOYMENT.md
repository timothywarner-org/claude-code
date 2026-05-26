# MCP Server Deployment

Options for deploying Python MCP servers.

## Table of Contents

1. [Local Development](#local-development)
2. [Claude Code Integration](#claude-code-integration)
3. [HTTP Deployment](#http-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Environment Configuration](#environment-configuration)

---

## Local Development

### Run Directly

```bash
# Basic run
python server.py

# With environment variables
MCP_MEMORY_PATH=./data/memory.json python server.py

# With debug output
MCP_DEBUG=1 python server.py
```

### Virtual Environment Setup

```bash
# Create venv
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Unix)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
python server.py
```

---

## Claude Code Integration

### Add Server (stdio transport)

```bash
# Basic
claude mcp add my-server -- python /path/to/server.py

# With custom name
claude mcp add custom-name -- python /path/to/server.py

# With environment variables
claude mcp add my-server -- env API_KEY=xxx python /path/to/server.py
```

### Add Server via Settings

Edit `~/.claude/settings.json` or `.claude/settings.json`:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "python",
      "args": ["/absolute/path/to/server.py"],
      "env": {
        "API_KEY": "your-api-key",
        "DEBUG": "true"
      }
    }
  }
}
```

### Manage Servers

```bash
# List all servers
claude mcp list

# Remove a server
claude mcp remove my-server

# Test server connection
claude mcp test my-server
```

---

## HTTP Deployment

### Basic HTTP Server

```python
from fastmcp import FastMCP
import uvicorn

mcp = FastMCP("http-server")

# ... define tools, resources, prompts ...

# Create HTTP app
app = mcp.http_app()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### With Starlette Integration

```python
from fastmcp import FastMCP
from starlette.applications import Starlette
from starlette.routing import Mount
import uvicorn

mcp = FastMCP("api-server")

# ... define tools ...

# Create MCP app
mcp_app = mcp.http_app(path="/mcp")

# Main application
app = Starlette(
    routes=[
        Mount("/api", app=mcp_app),
    ],
    lifespan=mcp_app.lifespan,
)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### With Authentication

```python
from fastmcp import FastMCP
from fastmcp.server.auth import BearerTokenProvider

auth = BearerTokenProvider(
    tokens={"secret-token": {"user": "admin"}}
)

mcp = FastMCP("secure-server", auth=auth)

# ... define tools ...

app = mcp.http_app()
```

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server
COPY server.py .
COPY data/ ./data/

# Create non-root user
RUN useradd --create-home appuser
USER appuser

# Environment
ENV PYTHONUNBUFFERED=1
ENV MCP_MEMORY_PATH=/app/data/memory.json

# Run server (stdio mode for MCP)
CMD ["python", "server.py"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    volumes:
      - ./data:/app/data
    environment:
      - API_KEY=${API_KEY}
      - DEBUG=false
    restart: unless-stopped

  # HTTP mode
  mcp-http:
    build: .
    command: ["python", "-c", "from server import mcp; import uvicorn; uvicorn.run(mcp.http_app(), host='0.0.0.0', port=8000)"]
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
    environment:
      - API_KEY=${API_KEY}
```

### Build and Run

```bash
# Build
docker build -t my-mcp-server .

# Run (stdio)
docker run -it my-mcp-server

# Run (HTTP)
docker run -p 8000:8000 my-mcp-server python -c \
  "from server import mcp; import uvicorn; uvicorn.run(mcp.http_app(), host='0.0.0.0', port=8000)"

# With environment
docker run -e API_KEY=xxx -it my-mcp-server
```

---

## Environment Configuration

### Required vs Optional

```python
import os

def get_env(key: str, default: str | None = None, required: bool = False) -> str | None:
    """Get environment variable with validation."""
    value = os.environ.get(key, default)
    if required and not value:
        raise ValueError(f"Required environment variable not set: {key}")
    return value

# Required
API_KEY = get_env("API_KEY", required=True)

# Optional with default
DEBUG = get_env("DEBUG", default="false") == "true"
PORT = int(get_env("PORT", default="8000"))
DATA_PATH = Path(get_env("DATA_PATH", default="./data"))
```

### .env File Support

```python
# Install: pip install python-dotenv
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Now os.environ has .env values
API_KEY = os.environ.get("API_KEY")
```

### Example .env

```bash
# .env (DO NOT COMMIT)
API_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost/db
DEBUG=true
LOG_LEVEL=info
```

### .env.example

```bash
# .env.example (COMMIT THIS)
API_KEY=your-api-key-here
DATABASE_URL=postgresql://user:pass@localhost/db
DEBUG=false
LOG_LEVEL=warning
```

---

## Production Checklist

- [ ] Environment variables for all secrets
- [ ] No hardcoded credentials in code
- [ ] Error handling with meaningful messages
- [ ] Logging to stderr (not stdout)
- [ ] Health check endpoint (for HTTP)
- [ ] Graceful shutdown handling
- [ ] Rate limiting for public endpoints
- [ ] Input validation on all tools
- [ ] Resource cleanup in lifespan
- [ ] Non-root user in Docker
