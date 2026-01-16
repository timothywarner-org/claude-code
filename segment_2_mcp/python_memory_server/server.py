#!/usr/bin/env python3
"""
Python Memory MCP Server

A production-ready FastMCP server demonstrating all MCP primitives:
- Tools: Actions the LLM can execute
- Resources: Data the LLM can read
- Prompts: Reusable prompt templates

This is the Python equivalent of the TypeScript memory server, designed
for teaching MCP concepts with real, working code.

Installation:
    pip install fastmcp pydantic

Run standalone:
    python server.py

Add to Claude Code:
    claude mcp add python-memory -- python segment_2_mcp/python_memory_server/server.py

Environment Variables:
    MCP_MEMORY_PATH: Path to memory JSON file (default: ./data/python_memory.json)
"""

from __future__ import annotations

import json
import os
import secrets
import sys
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from fastmcp import FastMCP, Context
from pydantic import BaseModel, Field as PydanticField


# =============================================================================
# CONFIGURATION
# =============================================================================

MEMORY_PATH = Path(os.environ.get("MCP_MEMORY_PATH", "./data/python_memory.json"))


# =============================================================================
# DATA MODELS (Pydantic for validation and serialization)
# =============================================================================

class Decision(BaseModel):
    """An architectural or design decision."""
    id: str
    title: str
    description: str
    rationale: str
    date: str
    tags: list[str] = []


class Convention(BaseModel):
    """A coding convention or best practice."""
    id: str
    name: str
    description: str
    examples: list[str] = []
    category: str = "general"


class Note(BaseModel):
    """A general note or piece of information."""
    id: str
    title: str
    content: str
    date: str
    tags: list[str] = []


class Memory(BaseModel):
    """The complete memory store."""
    decisions: list[Decision] = []
    conventions: list[Convention] = []
    notes: list[Note] = []
    context: dict[str, str] = {}
    last_updated: str = ""


# =============================================================================
# STATE MANAGEMENT
# =============================================================================

@dataclass
class AppState:
    """Application state passed through lifespan context."""
    memory: Memory
    memory_path: Path


def load_memory(path: Path) -> Memory:
    """Load memory from disk, or create empty memory if file doesn't exist."""
    if path.exists():
        try:
            return Memory.model_validate_json(path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Warning: Failed to load memory, starting fresh: {e}", file=sys.stderr)
    return Memory()


def save_memory(memory: Memory, path: Path) -> None:
    """Save memory to disk."""
    memory.last_updated = datetime.now().isoformat()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(memory.model_dump_json(indent=2), encoding="utf-8")


def generate_id() -> str:
    """Generate a unique ID using timestamp and random hex."""
    return f"{int(datetime.now().timestamp())}-{secrets.token_hex(4)}"


# =============================================================================
# LIFESPAN MANAGEMENT (Setup/Teardown)
# =============================================================================

@asynccontextmanager
async def lifespan(server: FastMCP):
    """
    Manage server lifecycle.

    This async context manager:
    1. Runs setup code before server starts (load memory)
    2. Yields state that's accessible in tools via ctx.state
    3. Runs cleanup code when server stops (save memory)
    """
    # Startup
    memory = load_memory(MEMORY_PATH)
    print(f"Memory loaded: {len(memory.decisions)} decisions, "
          f"{len(memory.conventions)} conventions, {len(memory.notes)} notes",
          file=sys.stderr)

    # Yield state to tools
    state = AppState(memory=memory, memory_path=MEMORY_PATH)
    yield state

    # Shutdown
    save_memory(state.memory, MEMORY_PATH)
    print("Memory saved.", file=sys.stderr)


# =============================================================================
# SERVER INSTANCE
# =============================================================================

mcp = FastMCP(
    name="python-memory",
    version="1.0.0",
    description="Persistent memory server for project context, decisions, and notes",
    lifespan=lifespan,
)


# =============================================================================
# TOOLS - Actions the LLM can execute
# =============================================================================

@mcp.tool
async def remember_decision(
    ctx: Context,
    title: str = PydanticField(description="Short title for the decision"),
    description: str = PydanticField(description="Detailed description of what was decided"),
    rationale: str = PydanticField(description="Why this decision was made"),
    tags: list[str] = PydanticField(default=[], description="Tags for categorization"),
) -> str:
    """
    Store an architectural or design decision for future reference.

    Use this to record important decisions about architecture, technology choices,
    patterns, or any significant project direction.
    """
    state: AppState = ctx.state

    decision = Decision(
        id=generate_id(),
        title=title,
        description=description,
        rationale=rationale,
        date=datetime.now().isoformat(),
        tags=tags,
    )

    state.memory.decisions.append(decision)
    save_memory(state.memory, state.memory_path)

    return f"Decision recorded: '{title}' (ID: {decision.id})"


@mcp.tool
async def recall_decisions(
    ctx: Context,
    query: str = PydanticField(default="", description="Search in title, description, and tags"),
    tag: str = PydanticField(default="", description="Filter by specific tag"),
    limit: int = PydanticField(default=10, ge=1, le=100, description="Maximum results to return"),
) -> list[dict[str, Any]]:
    """
    Search and retrieve past decisions.

    Returns matching decisions as a list of dictionaries. Use query for
    full-text search or tag for filtering by category.
    """
    state: AppState = ctx.state
    results = list(state.memory.decisions)

    # Filter by tag
    if tag:
        tag_lower = tag.lower()
        results = [d for d in results if any(tag_lower in t.lower() for t in d.tags)]

    # Search by query
    if query:
        q = query.lower()
        results = [
            d for d in results
            if q in d.title.lower()
            or q in d.description.lower()
            or any(q in t.lower() for t in d.tags)
        ]

    # Apply limit and convert to dicts
    return [d.model_dump() for d in results[:limit]]


@mcp.tool
async def add_convention(
    ctx: Context,
    name: str = PydanticField(description="Name of the convention"),
    description: str = PydanticField(description="Description of what to do and why"),
    examples: list[str] = PydanticField(default=[], description="Code examples demonstrating the convention"),
    category: str = PydanticField(default="general", description="Category: naming, structure, testing, style, etc."),
) -> str:
    """
    Record a coding convention or best practice for the project.

    Conventions help maintain consistency across the codebase. Include
    examples to make them actionable.
    """
    state: AppState = ctx.state

    convention = Convention(
        id=generate_id(),
        name=name,
        description=description,
        examples=examples,
        category=category,
    )

    state.memory.conventions.append(convention)
    save_memory(state.memory, state.memory_path)

    return f"Convention recorded: '{name}' in category '{category}'"


@mcp.tool
async def get_conventions(
    ctx: Context,
    category: str = PydanticField(default="", description="Filter by category (partial match)"),
) -> list[dict[str, Any]]:
    """
    Retrieve coding conventions, optionally filtered by category.
    """
    state: AppState = ctx.state
    results = list(state.memory.conventions)

    if category:
        cat_lower = category.lower()
        results = [c for c in results if cat_lower in c.category.lower()]

    return [c.model_dump() for c in results]


@mcp.tool
async def add_note(
    ctx: Context,
    title: str = PydanticField(description="Note title"),
    content: str = PydanticField(description="Note content (supports markdown)"),
    tags: list[str] = PydanticField(default=[], description="Tags for organization"),
) -> str:
    """
    Add a general note or piece of information to remember.

    Notes are useful for capturing context, meeting notes, research findings,
    or any information that doesn't fit into decisions or conventions.
    """
    state: AppState = ctx.state

    note = Note(
        id=generate_id(),
        title=title,
        content=content,
        date=datetime.now().isoformat(),
        tags=tags,
    )

    state.memory.notes.append(note)
    save_memory(state.memory, state.memory_path)

    return f"Note saved: '{title}' (ID: {note.id})"


@mcp.tool
async def search_notes(
    ctx: Context,
    query: str = PydanticField(description="Search query (searches title, content, and tags)"),
) -> list[dict[str, Any]]:
    """
    Search through saved notes.
    """
    state: AppState = ctx.state
    q = query.lower()

    results = [
        n for n in state.memory.notes
        if q in n.title.lower()
        or q in n.content.lower()
        or any(q in t.lower() for t in n.tags)
    ]

    return [n.model_dump() for n in results]


@mcp.tool
async def set_context(
    ctx: Context,
    key: str = PydanticField(description="Context key"),
    value: str = PydanticField(description="Context value"),
) -> str:
    """
    Store a key-value pair in project context.

    Context is useful for storing simple configuration or state that
    needs to persist across sessions.
    """
    state: AppState = ctx.state
    state.memory.context[key] = value
    save_memory(state.memory, state.memory_path)

    return f"Context set: {key} = {value}"


@mcp.tool
async def get_context(
    ctx: Context,
    key: str = PydanticField(default="", description="Specific key to retrieve (empty for all)"),
) -> dict[str, str] | str:
    """
    Retrieve a value from project context.
    """
    state: AppState = ctx.state

    if key:
        return state.memory.context.get(key, f"No context found for key: {key}")

    return state.memory.context


@mcp.tool
async def memory_summary(ctx: Context) -> dict[str, Any]:
    """
    Get a summary of all stored memory.

    Returns counts and metadata about stored items.
    """
    state: AppState = ctx.state

    return {
        "decisions": len(state.memory.decisions),
        "conventions": len(state.memory.conventions),
        "notes": len(state.memory.notes),
        "context_keys": len(state.memory.context),
        "last_updated": state.memory.last_updated,
    }


# =============================================================================
# RESOURCES - Data the LLM can read
# =============================================================================

@mcp.resource("memory://decisions")
async def resource_decisions(ctx: Context) -> str:
    """All recorded architectural decisions as JSON."""
    state: AppState = ctx.state
    return json.dumps([d.model_dump() for d in state.memory.decisions], indent=2)


@mcp.resource("memory://conventions")
async def resource_conventions(ctx: Context) -> str:
    """All coding conventions as JSON."""
    state: AppState = ctx.state
    return json.dumps([c.model_dump() for c in state.memory.conventions], indent=2)


@mcp.resource("memory://notes")
async def resource_notes(ctx: Context) -> str:
    """All saved notes as JSON."""
    state: AppState = ctx.state
    return json.dumps([n.model_dump() for n in state.memory.notes], indent=2)


@mcp.resource("memory://context")
async def resource_context(ctx: Context) -> str:
    """Project context key-value store as JSON."""
    state: AppState = ctx.state
    return json.dumps(state.memory.context, indent=2)


# Dynamic resource with URI template
@mcp.resource("memory://decisions/{decision_id}")
async def resource_decision_by_id(ctx: Context, decision_id: str) -> str:
    """Retrieve a specific decision by ID."""
    state: AppState = ctx.state

    for d in state.memory.decisions:
        if d.id == decision_id:
            return json.dumps(d.model_dump(), indent=2)

    return json.dumps({"error": f"Decision not found: {decision_id}"})


@mcp.resource("memory://notes/{note_id}")
async def resource_note_by_id(ctx: Context, note_id: str) -> str:
    """Retrieve a specific note by ID."""
    state: AppState = ctx.state

    for n in state.memory.notes:
        if n.id == note_id:
            return json.dumps(n.model_dump(), indent=2)

    return json.dumps({"error": f"Note not found: {note_id}"})


# =============================================================================
# PROMPTS - Reusable prompt templates
# =============================================================================

@mcp.prompt(
    name="decision_template",
    description="Template for documenting architectural decisions using ADR format",
    tags={"architecture", "documentation"},
)
def prompt_decision_template(
    topic: str = PydanticField(description="What the decision is about"),
    context: str = PydanticField(description="Background and context for the decision"),
    options: str = PydanticField(description="Available options being considered"),
) -> str:
    """Generate a structured decision analysis request."""
    return f"""I need to make an architectural decision about: {topic}

## Context
{context}

## Options Being Considered
{options}

Please analyze each option considering:
1. **Technical Fit**: How well does it solve the problem?
2. **Complexity**: Implementation and maintenance burden
3. **Team Impact**: Learning curve and familiarity
4. **Scalability**: How will it handle growth?
5. **Reversibility**: How hard is it to change later?

Then provide:
- A clear recommendation with rationale
- Key risks and mitigations
- Implementation next steps

Format as an Architecture Decision Record (ADR) that can be stored for future reference."""


@mcp.prompt(
    name="convention_template",
    description="Template for proposing new coding conventions",
    tags={"conventions", "standards"},
)
def prompt_convention_template(
    name: str = PydanticField(description="Name of the proposed convention"),
    problem: str = PydanticField(description="Problem this convention solves"),
    current_state: str = PydanticField(default="", description="How things are done currently"),
) -> str:
    """Generate a convention proposal request."""
    base = f"""I want to establish a coding convention: {name}

## Problem
{problem}
"""
    if current_state:
        base += f"""
## Current State
{current_state}
"""

    base += """
Please help me define this convention by providing:
1. **Clear Rule**: One sentence describing what to do
2. **Rationale**: Why this matters
3. **Good Examples**: 2-3 code examples showing the convention
4. **Bad Examples**: 2-3 code examples showing what to avoid
5. **Exceptions**: When it's okay to deviate
6. **Enforcement**: How to check compliance (linter rules, PR review, etc.)

Format for storage in our conventions database."""

    return base


@mcp.prompt(
    name="context_review",
    description="Review project memory and provide insights",
    tags={"review", "analysis"},
)
def prompt_context_review() -> str:
    """Generate a memory review request."""
    return """Please review the current project memory and provide:

1. **Decisions Summary**: Key architectural decisions and their rationale
2. **Convention Highlights**: Most important coding standards
3. **Knowledge Gaps**: Areas that may need more documentation
4. **Potential Conflicts**: Any decisions or conventions that might conflict
5. **Recommendations**: Suggestions for improving project documentation

Use the memory resources (memory://decisions, memory://conventions, memory://notes, memory://context) to access the data.

Format as a structured report suitable for a team meeting."""


@mcp.prompt(
    name="onboarding_guide",
    description="Generate an onboarding guide from project memory",
    tags={"onboarding", "documentation"},
)
def prompt_onboarding_guide(
    role: str = PydanticField(default="developer", description="Role of the new team member"),
) -> str:
    """Generate an onboarding request based on stored memory."""
    return f"""A new {role} is joining the project. Based on our stored memory, please create an onboarding guide that covers:

1. **Key Decisions**: Most important architectural decisions they should understand
2. **Coding Standards**: Essential conventions they must follow
3. **Project Context**: Important background information
4. **Common Pitfalls**: Things to watch out for based on past notes
5. **Resources**: Where to find more information

Use the memory resources to gather this information and format it as a friendly, actionable onboarding document."""


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    print(f"Starting Python Memory Server...", file=sys.stderr)
    print(f"Storage: {MEMORY_PATH.absolute()}", file=sys.stderr)
    print(f"Transport: stdio", file=sys.stderr)
    print("", file=sys.stderr)
    print("To add to Claude Code:", file=sys.stderr)
    print(f"  claude mcp add python-memory -- python {Path(__file__).absolute()}", file=sys.stderr)
    print("", file=sys.stderr)

    mcp.run()
