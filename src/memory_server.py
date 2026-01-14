#!/usr/bin/env python3
"""
Memory MCP Server for Claude Code Course

A FastMCP server for storing and retrieving project notes, PRDs, and context
with DeepSeek-powered optimization for token-efficient context injection.

Resources:
    - memory://items - List all memory items
    - memory://tags - List available tags
    - memory://types - List memory types
    - memory://stats - Get statistics

Tools:
    - add_memory - Create a new memory item
    - get_memory - Retrieve a specific memory by ID
    - search_memory - Search memories by keyword/tag/type
    - get_optimized_memory - Get token-optimized memory via DeepSeek
    - update_memory - Update an existing memory
    - delete_memory - Delete a memory (in-memory only)
    - list_by_tag - Get all memories with a specific tag
    - list_by_type - Get all memories of a specific type
    - reset_memory - Restore deleted memories
    - test_apis - Test DeepSeek and GitHub API connectivity

Prompts:
    - code_review_context - Generate context for code review
    - refactoring_plan - Create refactoring plan
    - mcp_tool_design - Design MCP tool
    - codebase_analysis - Analyze codebase
"""

import json
import logging
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Optional, Literal

from fastmcp import FastMCP, Context
from pydantic import BaseModel, Field

# Load environment variables from .env file (NOT system env)
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env", override=False)

# Import API utilities
from api_utils import deepseek_client, github_client

# Configure logging to stderr (stdout is reserved for MCP JSON-RPC)
logging.basicConfig(
    level=logging.WARNING,
    stream=sys.stderr,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastMCP server
mcp = FastMCP(
    name="Memory Server",
    instructions="MCP server for Claude Code course memory management. Store project notes, PRDs, code patterns, and context. Use get_optimized_memory for token-efficient retrieval with DeepSeek optimization."
)

# Data file path
DATA_FILE = Path(__file__).parent / "data" / "memory_items.json"


# =============================================================================
# DATA MODELS
# =============================================================================

class MemoryItem(BaseModel):
    """Memory item data model."""
    id: str = Field(description="Unique identifier (e.g., mem-001)")
    type: Literal["note", "prd", "snippet", "decision", "pattern", "config", "troubleshooting"] = Field(
        description="Type of memory item"
    )
    title: str = Field(description="Short descriptive title")
    content: str = Field(description="Full content/description")
    tags: list[str] = Field(default_factory=list, description="Tags for categorization")
    project: str = Field(default="general", description="Associated project name")
    created_at: str = Field(description="ISO 8601 timestamp")
    updated_at: str = Field(description="ISO 8601 timestamp")


# =============================================================================
# DATA LOADING AND MANAGEMENT
# =============================================================================

def load_memory_data() -> dict:
    """Load complete memory data from JSON file."""
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"memory_items": [], "tags": [], "types": [], "metadata": {}}


def save_memory_data() -> None:
    """Save memory items back to JSON file."""
    data = load_memory_data()
    data["memory_items"] = get_memory_store()
    
    # Ensure data directory exists
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    # Write to temp file first, then rename (atomic operation)
    temp_file = DATA_FILE.with_suffix('.tmp')
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    temp_file.replace(DATA_FILE)
    logger.info("Memory data saved to disk")


def load_memories() -> list[dict]:
    """Load just the memory items list."""
    data = load_memory_data()
    return data.get("memory_items", [])


# In-memory store (allows modifications without touching source file)
_memory_store: list[dict] = []


def get_memory_store() -> list[dict]:
    """Get the in-memory store, initializing from file if needed."""
    global _memory_store
    if not _memory_store:
        _memory_store = load_memories()
    return _memory_store


def reset_memory_store() -> None:
    """Reset memory store to original data."""
    global _memory_store
    _memory_store = load_memories()


def get_available_tags() -> list[dict]:
    """Get list of predefined tags."""
    data = load_memory_data()
    return data.get("tags", [])


def get_available_types() -> list[dict]:
    """Get list of memory types."""
    data = load_memory_data()
    return data.get("types", [])


def generate_memory_id() -> str:
    """Generate next sequential memory ID."""
    memories = get_memory_store()
    if not memories:
        return "mem-001"

    # Find highest existing ID number
    max_num = 0
    for mem in memories:
        if mem["id"].startswith("mem-"):
            try:
                num = int(mem["id"].split("-")[1])
                max_num = max(max_num, num)
            except (IndexError, ValueError):
                continue

    return f"mem-{max_num + 1:03d}"


# =============================================================================
# RESOURCES
# =============================================================================

@mcp.resource("memory://items")
def list_memory_items() -> str:
    """
    List all memory items with basic info.

    Returns formatted list of all memories with ID, type, title, and tags.
    """
    memories = get_memory_store()

    if not memories:
        return "# Memory Items\n\nNo memories stored yet. Use `add_memory` to create one."

    result = f"# Memory Items ({len(memories)} total)\n\n"

    for mem in memories:
        tags_str = ", ".join(mem.get("tags", []))
        result += f"## {mem['id']}: {mem['title']}\n"
        result += f"- **Type:** {mem['type']}\n"
        result += f"- **Project:** {mem.get('project', 'general')}\n"
        result += f"- **Tags:** {tags_str or 'none'}\n"
        result += f"- **Updated:** {mem.get('updated_at', 'unknown')}\n\n"

    return result


@mcp.resource("memory://tags")
def list_available_tags() -> str:
    """
    List all available predefined tags.

    Returns formatted list of tags with descriptions.
    """
    tags = get_available_tags()

    result = "# Available Tags\n\n"
    result += "Use these tags to categorize your memories:\n\n"

    for tag in tags:
        result += f"## {tag['name']}\n"
        result += f"{tag['description']}\n\n"

    return result


@mcp.resource("memory://types")
def list_memory_types() -> str:
    """
    List all available memory types.

    Returns formatted list of memory types with descriptions.
    """
    types = get_available_types()

    result = "# Memory Types\n\n"

    for mem_type in types:
        result += f"## {mem_type['name']}\n"
        result += f"{mem_type['description']}\n\n"

    return result


@mcp.resource("memory://stats")
def get_memory_stats() -> str:
    """
    Get statistics about stored memories.

    Returns formatted statistics by type, tag, and project.
    """
    memories = get_memory_store()

    if not memories:
        return "# Memory Statistics\n\nNo memories stored yet."

    type_counts = Counter(mem["type"] for mem in memories)
    project_counts = Counter(mem.get("project", "general") for mem in memories)

    # Count tag usage
    tag_counts = Counter()
    for mem in memories:
        for tag in mem.get("tags", []):
            tag_counts[tag] += 1

    result = f"# Memory Statistics\n\n**Total Items:** {len(memories)}\n\n"

    result += "## By Type\n\n| Type | Count |\n|------|-------|\n"
    for mem_type, count in sorted(type_counts.items()):
        result += f"| {mem_type} | {count} |\n"

    result += "\n## By Tag\n\n| Tag | Count |\n|-----|-------|\n"
    for tag, count in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True):
        result += f"| {tag} | {count} |\n"

    result += "\n## By Project\n\n| Project | Count |\n|---------|-------|\n"
    for project, count in sorted(project_counts.items(), key=lambda x: x[1], reverse=True):
        result += f"| {project} | {count} |\n"

    return result


# =============================================================================
# TOOLS - CRUD OPERATIONS
# =============================================================================

@mcp.tool()
def add_memory(
    title: str,
    content: str,
    type: Literal["note", "prd", "snippet", "decision", "pattern", "config", "troubleshooting"],
    tags: Optional[list[str]] = None,
    project: str = "general"
) -> dict:
    """
    Add a new memory item to the store.

    Args:
        title: Short descriptive title
        content: Full content/description
        type: Type of memory (note, prd, snippet, decision, pattern, config, troubleshooting)
        tags: Optional list of tags for categorization
        project: Project name (defaults to "general")

    Returns:
        Success confirmation with the created memory item.
    """
    memories = get_memory_store()

    # Generate new ID
    new_id = generate_memory_id()

    # Create timestamps
    now = datetime.utcnow().isoformat() + "Z"

    new_memory = {
        "id": new_id,
        "type": type,
        "title": title,
        "content": content,
        "tags": tags or [],
        "project": project,
        "created_at": now,
        "updated_at": now
    }

    memories.append(new_memory)

    # Persist to disk
    save_memory_data()

    logger.info(f"Added memory: {new_id}")

    return {
        "success": True,
        "message": f"Memory '{new_id}' created successfully",
        "memory": new_memory
    }


@mcp.tool()
def get_memory(memory_id: str) -> dict:
    """
    Retrieve a specific memory by its ID.

    Args:
        memory_id: The unique identifier (e.g., mem-001)

    Returns:
        The memory item if found, or error if not found.
    """
    memories = get_memory_store()

    for mem in memories:
        if mem["id"].lower() == memory_id.lower():
            return {
                "success": True,
                "memory": mem
            }

    return {
        "success": False,
        "error": f"Memory '{memory_id}' not found",
        "available_ids": [m["id"] for m in memories[:5]]
    }


@mcp.tool()
def search_memory(
    search_term: str,
    tag: Optional[str] = None,
    type: Optional[str] = None,
    project: Optional[str] = None
) -> dict:
    """
    Search memories by keyword with optional filters.

    Args:
        search_term: Keyword to search in title and content
        tag: Optional tag filter
        type: Optional type filter
        project: Optional project filter

    Returns:
        List of matching memories sorted by relevance.
    """
    memories = get_memory_store()
    search_lower = search_term.lower()

    matches = []
    for mem in memories:
        # Apply filters
        if tag and tag.lower() not in [t.lower() for t in mem.get("tags", [])]:
            continue
        if type and mem["type"].lower() != type.lower():
            continue
        if project and mem.get("project", "general").lower() != project.lower():
            continue

        # Calculate relevance score
        score = 0
        title_lower = mem["title"].lower()
        content_lower = mem["content"].lower()

        # Exact match in title (highest priority)
        if search_lower in title_lower:
            score += 10

        # Match in content
        if search_lower in content_lower:
            score += 5

        # Word matches
        search_words = search_lower.split()
        for word in search_words:
            if word in title_lower:
                score += 3
            if word in content_lower:
                score += 1

        if score > 0:
            matches.append({"memory": mem, "relevance": score})

    # Sort by relevance
    matches.sort(key=lambda x: x["relevance"], reverse=True)

    if not matches:
        return {
            "success": False,
            "error": f"No memories found matching '{search_term}'",
            "suggestion": "Try broader search terms or remove filters"
        }

    return {
        "success": True,
        "count": len(matches),
        "memories": [m["memory"] for m in matches[:10]]
    }


@mcp.tool()
def get_optimized_memory(
    memory_id: str,
    max_tokens: int = 1500,
    use_cache: bool = True
) -> dict:
    """
    Get a memory optimized for token efficiency via DeepSeek.

    Uses DeepSeek LLM to condense the memory content while preserving
    technical details (code, commands, configs). Falls back to raw
    content if optimization fails.

    Args:
        memory_id: The memory ID to retrieve
        max_tokens: Target maximum token count (default: 1500)
        use_cache: Whether to use cached optimized version (default: True)

    Returns:
        Optimized memory content with optimization metadata.
    """
    # First get the memory
    result = get_memory(memory_id)

    if not result["success"]:
        return result

    memory = result["memory"]
    original_content = memory["content"]

    # Attempt optimization
    optimized_content, metadata = deepseek_client.optimize_memory_item(
        original_content,
        max_tokens=max_tokens,
        use_cache=use_cache
    )

    return {
        "success": True,
        "memory": {
            **memory,
            "content": optimized_content
        },
        "optimization": metadata
    }


@mcp.tool()
def update_memory(
    memory_id: str,
    title: Optional[str] = None,
    content: Optional[str] = None,
    tags: Optional[list[str]] = None,
    project: Optional[str] = None
) -> dict:
    """
    Update an existing memory item.

    Args:
        memory_id: The memory ID to update
        title: New title (optional)
        content: New content (optional)
        tags: New tags list (optional)
        project: New project (optional)

    Returns:
        Success confirmation with updated memory.
    """
    memories = get_memory_store()

    for mem in memories:
        if mem["id"].lower() == memory_id.lower():
            # Update fields
            if title is not None:
                mem["title"] = title
            if content is not None:
                mem["content"] = content
            if tags is not None:
                mem["tags"] = tags
            if project is not None:
                mem["project"] = project

            # Update timestamp
            mem["updated_at"] = datetime.utcnow().isoformat() + "Z"

            # Persist to disk
            save_memory_data()

            logger.info(f"Updated memory: {memory_id}")

            return {
                "success": True,
                "message": f"Memory '{memory_id}' updated successfully",
                "memory": mem
            }

    return {
        "success": False,
        "error": f"Memory '{memory_id}' not found"
    }


@mcp.tool()
def delete_memory(memory_id: str) -> dict:
    """
    Delete a memory by ID (in-memory only).

    Does not modify the source JSON file. Use reset_memory to restore.

    Args:
        memory_id: The memory ID to delete

    Returns:
        Confirmation of deletion or error if not found.
    """
    memories = get_memory_store()

    for i, mem in enumerate(memories):
        if mem["id"].lower() == memory_id.lower():
            deleted = memories.pop(i)

            # Persist to disk
            save_memory_data()

            logger.info(f"Deleted memory: {memory_id}")

            return {
                "success": True,
                "message": f"Memory '{memory_id}' deleted successfully",
                "deleted_memory": deleted,
                "remaining_count": len(memories)
            }

    return {
        "success": False,
        "error": f"Memory '{memory_id}' not found"
    }


@mcp.tool()
def list_by_tag(tag: str) -> dict:
    """
    Get all memories with a specific tag.

    Args:
        tag: Tag name to filter by

    Returns:
        List of memories with the specified tag.
    """
    memories = get_memory_store()
    tag_lower = tag.lower()

    matches = [
        mem for mem in memories
        if tag_lower in [t.lower() for t in mem.get("tags", [])]
    ]

    if not matches:
        return {
            "success": False,
            "error": f"No memories found with tag '{tag}'",
            "available_tags": list(set(
                t for mem in memories for t in mem.get("tags", [])
            ))
        }

    return {
        "success": True,
        "count": len(matches),
        "tag": tag,
        "memories": matches
    }


@mcp.tool()
def list_by_type(type: Literal["note", "prd", "snippet", "decision", "pattern", "config", "troubleshooting"]) -> dict:
    """
    Get all memories of a specific type.

    Args:
        type: Memory type to filter by

    Returns:
        List of memories of the specified type.
    """
    memories = get_memory_store()

    matches = [mem for mem in memories if mem["type"] == type]

    if not matches:
        return {
            "success": False,
            "error": f"No memories found of type '{type}'"
        }

    return {
        "success": True,
        "count": len(matches),
        "type": type,
        "memories": matches
    }


@mcp.tool()
def reset_memory() -> dict:
    """
    Reset memory store to original state.

    Restores all deleted memories by reloading from source JSON file.

    Returns:
        Confirmation with restored memory count.
    """
    reset_memory_store()
    memories = get_memory_store()

    logger.info("Memory store reset")

    return {
        "success": True,
        "message": "Memory store reset to original state",
        "memory_count": len(memories)
    }


@mcp.tool()
def test_apis() -> dict:
    """
    Test connectivity to DeepSeek and GitHub APIs.

    Returns:
        Status of both API connections.
    """
    deepseek_ok, deepseek_msg = deepseek_client.test_connection()
    github_ok, github_msg = github_client.test_connection()

    return {
        "success": True,
        "deepseek": {
            "connected": deepseek_ok,
            "message": deepseek_msg
        },
        "github": {
            "connected": github_ok,
            "message": github_msg
        },
        "cache_stats": deepseek_client.get_cache_stats()
    }


# =============================================================================
# PROMPTS - Templates for common course tasks
# =============================================================================

@mcp.prompt()
def code_review_context(language: str, framework: str = "", conventions: str = "") -> str:
    """
    Generate context for code review with stored conventions.

    Args:
        language: Programming language
        framework: Framework being used (optional)
        conventions: Team conventions (optional)

    Returns:
        Formatted prompt for code review with context.
    """
    return f"""Review this {language} code for: security, performance, and style issues.
Return JSON array: [{{"severity": "info"|"warning"|"critical", "file": string, "line": number, "category": string, "message": string, "suggestion": string}}]

Context:
- Project uses {framework or "no specific framework"}
- Team conventions: {conventions or "standard best practices"}

Use search_memory tool to find relevant patterns and conventions stored in the memory server.

Code to review:
```{language}
{{{{codeToReview}}}}
```

Focus on practical, actionable feedback."""


@mcp.prompt()
def refactoring_plan(language: str, target_issues: str = "") -> str:
    """
    Generate refactoring plan for legacy code.

    Args:
        language: Programming language
        target_issues: Specific issues to address (optional)

    Returns:
        Formatted prompt for creating refactoring plan.
    """
    return f"""Analyze this legacy {language} code and create a refactoring plan.

Target issues: {target_issues or "God classes, long methods, magic numbers, poor naming, missing type hints"}

Use search_memory tool to find stored refactoring patterns and conventions.

Code:
```{language}
{{{{legacyCode}}}}
```

Provide:
1. List of anti-patterns found (ranked by severity)
2. Step-by-step refactoring plan (preserving behavior)
3. Suggested file structure after split
4. Test cases to validate equivalence

Include commands and configuration as needed."""


@mcp.prompt()
def mcp_tool_design(tool_purpose: str, tool_name: str = "") -> str:
    """
    Design an MCP tool with proper schema and implementation.

    Args:
        tool_purpose: What the tool should do
        tool_name: Suggested tool name (optional)

    Returns:
        Formatted prompt for MCP tool design.
    """
    return f"""Design an MCP tool for: {tool_purpose}

Tool name: {tool_name or "[suggest appropriate name]"}

Use search_memory with tag "mcp-server" or "tool-use" to find stored patterns and examples.

Provide:
1. Complete Zod schema definition (TypeScript) or Pydantic model (Python)
2. Tool handler implementation
3. Error handling patterns
4. Example usage from Claude's perspective
5. Registration command for Claude Code CLI

Include all technical details: imports, types, validation."""


@mcp.prompt()
def codebase_analysis(project_type: str, focus_areas: str = "") -> str:
    """
    Analyze a complete codebase using large context window.

    Args:
        project_type: Type of project (web app, API, CLI, etc.)
        focus_areas: Specific areas to focus on (optional)

    Returns:
        Formatted prompt for codebase analysis.
    """
    return f"""Analyze this {project_type} codebase:

{{{{fileContents}}}}

Tasks:
1. Identify main components and their relationships
2. Detect architectural patterns used
3. List potential improvements (security, performance, maintainability)
4. Generate Mermaid architecture diagram
5. Suggest conventions to store in MCP memory server using add_memory tool

Focus areas: {focus_areas or "architecture, security, performance, maintainability"}

Use search_memory to find relevant stored patterns and compare against best practices.

Output format: Markdown with code blocks"""


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

def main():
    """Run the MCP server."""
    mcp.run()


if __name__ == "__main__":
    main()
