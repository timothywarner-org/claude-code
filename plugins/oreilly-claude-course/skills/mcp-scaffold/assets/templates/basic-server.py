#!/usr/bin/env python3
"""
{{SERVER_NAME}} MCP Server

A minimal FastMCP server with a single tool.

Usage:
    python server.py

Add to Claude Code:
    claude mcp add {{SERVER_NAME}} -- python server.py
"""

from fastmcp import FastMCP
from pydantic import Field

# Initialize server
mcp = FastMCP(
    name="{{SERVER_NAME}}",
    version="1.0.0",
    description="{{DESCRIPTION}}"
)


# =============================================================================
# TOOLS
# =============================================================================

@mcp.tool
def hello(
    name: str = Field(description="Name to greet")
) -> str:
    """
    Greet someone by name.

    This is a simple example tool. Replace with your own functionality.
    """
    return f"Hello, {name}! Welcome to {{SERVER_NAME}}."


@mcp.tool
def add(
    a: int = Field(description="First number"),
    b: int = Field(description="Second number")
) -> int:
    """Add two numbers together."""
    return a + b


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import sys
    print(f"Starting {{SERVER_NAME}} server...", file=sys.stderr)
    mcp.run()
