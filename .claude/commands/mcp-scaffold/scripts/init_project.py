#!/usr/bin/env python3
"""
Initialize MCP Project in Current Directory

Sets up an MCP server project in the current directory with
proper structure for development and deployment.

Usage:
    python init_project.py <server-name>

Creates:
    - server.py (main MCP server)
    - requirements.txt (dependencies)
    - README.md (documentation)
    - data/ (data directory)
    - .gitignore (git ignores)
    - .env.example (environment template)

This is different from scaffold.py in that it initializes
in the CURRENT directory rather than creating a new one.
"""

import argparse
import re
import sys
from pathlib import Path


def validate_name(name: str) -> bool:
    """Validate server name."""
    return bool(re.match(r'^[a-z][a-z0-9-]*$', name))


def to_upper_snake(name: str) -> str:
    """Convert server-name to SERVER_NAME."""
    return name.upper().replace('-', '_')


def confirm(message: str) -> bool:
    """Ask for confirmation."""
    response = input(f"{message} [y/N] ").strip().lower()
    return response in ('y', 'yes')


def init_project(name: str, description: str, force: bool = False):
    """Initialize MCP project in current directory."""
    cwd = Path.cwd()

    # Check for existing files
    existing = []
    for fname in ['server.py', 'requirements.txt', 'README.md']:
        if (cwd / fname).exists():
            existing.append(fname)

    if existing and not force:
        print(f"Warning: The following files already exist: {', '.join(existing)}")
        if not confirm("Overwrite?"):
            print("Aborted.")
            sys.exit(0)

    name_upper = to_upper_snake(name)

    # Create server.py
    server_py = f'''#!/usr/bin/env python3
"""
{name} MCP Server

{description}

Usage:
    python server.py

Add to Claude Code:
    claude mcp add {name} -- python server.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from fastmcp import FastMCP, Context
from pydantic import Field as PydanticField


# Configuration
DATA_PATH = Path(os.environ.get("{name_upper}_DATA_PATH", "./data/{name}.json"))


# Initialize server
mcp = FastMCP(
    name="{name}",
    version="1.0.0",
    description="{description}"
)


# =============================================================================
# TOOLS
# =============================================================================

@mcp.tool
def hello(
    name: str = PydanticField(description="Name to greet")
) -> str:
    """Greet someone by name."""
    return f"Hello, {{name}}!"


# TODO: Add your tools here
# @mcp.tool
# def my_tool(param: str) -> str:
#     """Tool description."""
#     return f"Result: {{param}}"


# =============================================================================
# RESOURCES
# =============================================================================

@mcp.resource("{name}://status")
def status_resource() -> str:
    """Server status information."""
    return json.dumps({{
        "status": "running",
        "version": "1.0.0"
    }})


# TODO: Add your resources here
# @mcp.resource("{name}://data")
# def data_resource() -> str:
#     """Data resource."""
#     return json.dumps({{"data": []}})


# =============================================================================
# PROMPTS
# =============================================================================

@mcp.prompt
def help_prompt() -> str:
    """Get help with using this server."""
    return """Please explain what tools and resources are available
in this MCP server and how to use them effectively."""


# TODO: Add your prompts here
# @mcp.prompt
# def my_prompt(topic: str) -> str:
#     """Generate a request about a topic."""
#     return f"Please help me with {{topic}}."


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    print(f"Starting {name} server...", file=sys.stderr)
    print(f"Data path: {{DATA_PATH.absolute()}}", file=sys.stderr)
    mcp.run()
'''

    (cwd / "server.py").write_text(server_py, encoding="utf-8")
    print(f"Created: server.py")

    # Create requirements.txt
    requirements = f'''# {name} MCP Server Dependencies
fastmcp>=2.0.0
pydantic>=2.0.0
'''
    (cwd / "requirements.txt").write_text(requirements, encoding="utf-8")
    print(f"Created: requirements.txt")

    # Create README.md
    readme = f'''# {name}

{description}

## Installation

```bash
pip install -r requirements.txt
```

## Usage

```bash
python server.py
```

## Add to Claude Code

```bash
claude mcp add {name} -- python server.py
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `{name_upper}_DATA_PATH` | `./data/{name}.json` | Data file path |
'''
    (cwd / "README.md").write_text(readme, encoding="utf-8")
    print(f"Created: README.md")

    # Create data directory
    data_dir = cwd / "data"
    data_dir.mkdir(exist_ok=True)
    (data_dir / ".gitkeep").touch()
    print(f"Created: data/")

    # Create .gitignore
    gitignore = '''# Python
__pycache__/
*.py[cod]
.venv/
venv/

# Data
data/*.json
!data/.gitkeep

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
'''
    (cwd / ".gitignore").write_text(gitignore, encoding="utf-8")
    print(f"Created: .gitignore")

    # Create .env.example
    env_example = f'''# {name} Configuration
# Copy to .env and fill in values

# Data storage path (optional)
# {name_upper}_DATA_PATH=./data/{name}.json

# Add your environment variables here
# API_KEY=your-api-key
'''
    (cwd / ".env.example").write_text(env_example, encoding="utf-8")
    print(f"Created: .env.example")

    # Summary
    print()
    print("=" * 50)
    print(f"MCP Server '{name}' initialized!")
    print("=" * 50)
    print()
    print("Next steps:")
    print("  1. pip install -r requirements.txt")
    print("  2. Edit server.py to add your tools/resources/prompts")
    print("  3. python server.py")
    print()
    print("Add to Claude Code:")
    print(f"  claude mcp add {name} -- python {cwd.absolute()}/server.py")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Initialize MCP project in current directory"
    )

    parser.add_argument(
        "name",
        help="Server name (lowercase, letters/numbers/hyphens)"
    )
    parser.add_argument(
        "--description", "-d",
        default="A FastMCP server",
        help="Server description"
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        help="Overwrite existing files without confirmation"
    )

    args = parser.parse_args()

    if not validate_name(args.name):
        print(f"Error: Invalid server name '{args.name}'", file=sys.stderr)
        print("Name must start with lowercase letter, contain only lowercase letters, numbers, and hyphens", file=sys.stderr)
        sys.exit(1)

    init_project(args.name, args.description, args.force)


if __name__ == "__main__":
    main()
