#!/usr/bin/env python3
"""
{{SERVER_NAME}} MCP Server

A production-ready FastMCP server demonstrating all MCP primitives:
- Tools: Actions the LLM can execute
- Resources: Data the LLM can read
- Prompts: Reusable prompt templates

Usage:
    python server.py

Add to Claude Code:
    claude mcp add {{SERVER_NAME}} -- python server.py

Environment Variables:
    {{SERVER_NAME_UPPER}}_DATA_PATH: Path to data file (default: ./data/{{SERVER_NAME}}.json)
"""

from __future__ import annotations

import json
import os
import secrets
import sys
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from fastmcp import FastMCP, Context
from fastmcp.exceptions import ToolError
from pydantic import BaseModel, Field as PydanticField


# =============================================================================
# CONFIGURATION
# =============================================================================

DATA_PATH = Path(os.environ.get("{{SERVER_NAME_UPPER}}_DATA_PATH", "./data/{{SERVER_NAME}}.json"))


# =============================================================================
# DATA MODELS
# =============================================================================

class Item(BaseModel):
    """Example data model."""
    id: str
    name: str
    description: str
    created_at: str
    tags: list[str] = []


class Storage(BaseModel):
    """Persistent storage model."""
    items: list[Item] = []
    metadata: dict[str, str] = {}
    last_updated: str = ""


# =============================================================================
# STORAGE FUNCTIONS
# =============================================================================

def load_storage() -> Storage:
    """Load storage from disk."""
    if DATA_PATH.exists():
        try:
            return Storage.model_validate_json(DATA_PATH.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Warning: Failed to load storage: {e}", file=sys.stderr)
    return Storage()


def save_storage(storage: Storage) -> None:
    """Save storage to disk."""
    storage.last_updated = datetime.now().isoformat()
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(storage.model_dump_json(indent=2), encoding="utf-8")


def generate_id() -> str:
    """Generate unique ID."""
    return f"{int(datetime.now().timestamp())}-{secrets.token_hex(4)}"


# =============================================================================
# STATE MANAGEMENT
# =============================================================================

@dataclass
class AppState:
    """Application state passed through lifespan context."""
    storage: Storage
    data_path: Path


@asynccontextmanager
async def lifespan(server: FastMCP):
    """
    Manage server lifecycle.

    - Startup: Load storage from disk
    - Yield: Provide state to tools
    - Shutdown: Save storage to disk
    """
    storage = load_storage()
    print(f"Storage loaded: {len(storage.items)} items", file=sys.stderr)

    state = AppState(storage=storage, data_path=DATA_PATH)
    yield state

    save_storage(state.storage)
    print("Storage saved.", file=sys.stderr)


# =============================================================================
# SERVER INITIALIZATION
# =============================================================================

mcp = FastMCP(
    name="{{SERVER_NAME}}",
    version="1.0.0",
    description="{{DESCRIPTION}}",
    lifespan=lifespan,
)


# =============================================================================
# TOOLS - Actions the LLM can execute
# =============================================================================

@mcp.tool
async def create_item(
    ctx: Context,
    name: str = PydanticField(description="Item name"),
    description: str = PydanticField(description="Item description"),
    tags: list[str] = PydanticField(default=[], description="Tags for categorization"),
) -> str:
    """
    Create a new item.

    Returns the ID of the created item.
    """
    state: AppState = ctx.state

    item = Item(
        id=generate_id(),
        name=name,
        description=description,
        created_at=datetime.now().isoformat(),
        tags=tags,
    )

    state.storage.items.append(item)
    save_storage(state.storage)

    return f"Created item: '{name}' (ID: {item.id})"


@mcp.tool
async def list_items(
    ctx: Context,
    tag: str = PydanticField(default="", description="Filter by tag"),
    limit: int = PydanticField(default=10, ge=1, le=100, description="Maximum results"),
) -> list[dict[str, Any]]:
    """
    List all items, optionally filtered by tag.
    """
    state: AppState = ctx.state
    results = list(state.storage.items)

    if tag:
        results = [i for i in results if tag.lower() in [t.lower() for t in i.tags]]

    return [i.model_dump() for i in results[:limit]]


@mcp.tool
async def get_item(
    ctx: Context,
    item_id: str = PydanticField(description="Item ID to retrieve"),
) -> dict[str, Any]:
    """
    Get a specific item by ID.
    """
    state: AppState = ctx.state

    for item in state.storage.items:
        if item.id == item_id:
            return item.model_dump()

    raise ToolError(f"Item not found: {item_id}")


@mcp.tool
async def delete_item(
    ctx: Context,
    item_id: str = PydanticField(description="Item ID to delete"),
) -> str:
    """
    Delete an item by ID.
    """
    state: AppState = ctx.state

    for i, item in enumerate(state.storage.items):
        if item.id == item_id:
            deleted = state.storage.items.pop(i)
            save_storage(state.storage)
            return f"Deleted item: '{deleted.name}'"

    raise ToolError(f"Item not found: {item_id}")


@mcp.tool
async def set_metadata(
    ctx: Context,
    key: str = PydanticField(description="Metadata key"),
    value: str = PydanticField(description="Metadata value"),
) -> str:
    """
    Set a metadata key-value pair.
    """
    state: AppState = ctx.state
    state.storage.metadata[key] = value
    save_storage(state.storage)
    return f"Set metadata: {key} = {value}"


@mcp.tool
async def get_metadata(
    ctx: Context,
    key: str = PydanticField(default="", description="Key to get (empty for all)"),
) -> dict[str, str] | str:
    """
    Get metadata value(s).
    """
    state: AppState = ctx.state

    if key:
        return state.storage.metadata.get(key, f"Key not found: {key}")

    return state.storage.metadata


# =============================================================================
# RESOURCES - Data the LLM can read
# =============================================================================

@mcp.resource("{{SERVER_NAME}}://items")
async def resource_all_items(ctx: Context) -> str:
    """All items as JSON."""
    state: AppState = ctx.state
    return json.dumps([i.model_dump() for i in state.storage.items], indent=2)


@mcp.resource("{{SERVER_NAME}}://metadata")
async def resource_metadata(ctx: Context) -> str:
    """All metadata as JSON."""
    state: AppState = ctx.state
    return json.dumps(state.storage.metadata, indent=2)


@mcp.resource("{{SERVER_NAME}}://summary")
async def resource_summary(ctx: Context) -> str:
    """Storage summary."""
    state: AppState = ctx.state
    return json.dumps({
        "item_count": len(state.storage.items),
        "metadata_keys": list(state.storage.metadata.keys()),
        "last_updated": state.storage.last_updated,
    }, indent=2)


# Dynamic resource with URI template
@mcp.resource("{{SERVER_NAME}}://items/{item_id}")
async def resource_item_by_id(ctx: Context, item_id: str) -> str:
    """Get specific item by ID."""
    state: AppState = ctx.state

    for item in state.storage.items:
        if item.id == item_id:
            return json.dumps(item.model_dump(), indent=2)

    return json.dumps({"error": f"Item not found: {item_id}"})


# =============================================================================
# PROMPTS - Reusable prompt templates
# =============================================================================

@mcp.prompt(
    name="analyze_items",
    description="Request analysis of stored items",
    tags={"analysis"},
)
def prompt_analyze_items(
    focus: str = PydanticField(default="general", description="Analysis focus: general, tags, trends"),
) -> str:
    """Generate an item analysis request."""
    return f"""Please analyze the items stored in this server with a focus on {focus}.

Use the {{SERVER_NAME}}://items resource to access the data.

Provide:
1. Summary of items
2. Key patterns or themes
3. Suggestions for organization
4. Any notable observations"""


@mcp.prompt(
    name="create_item_template",
    description="Template for creating new items",
    tags={"creation"},
)
def prompt_create_item(
    category: str = PydanticField(description="Category of item to create"),
) -> str:
    """Generate an item creation template."""
    return f"""I need to create a new item in the '{category}' category.

Please help me by:
1. Suggesting a descriptive name
2. Writing a clear description
3. Recommending appropriate tags

Then use the create_item tool to add it."""


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    print(f"Starting {{SERVER_NAME}} server...", file=sys.stderr)
    print(f"Data path: {DATA_PATH.absolute()}", file=sys.stderr)
    print("", file=sys.stderr)
    print("To add to Claude Code:", file=sys.stderr)
    print(f"  claude mcp add {{SERVER_NAME}} -- python {Path(__file__).absolute()}", file=sys.stderr)
    print("", file=sys.stderr)

    mcp.run()
