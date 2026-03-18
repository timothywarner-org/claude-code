#!/usr/bin/env python3
"""
Memory MCP Server — "Remember This"

A teaching-focused MCP server that persists conversation context to local JSON.
Demonstrates all three MCP primitives:

    Tools      → Actions: save decisions, notes, conventions; search; summarize
    Resources  → Read-only data: memory://decisions, memory://notes, etc.
    Prompts    → Reusable templates: decision_record, convention_proposal, etc.

Quick start (UV):
    cd segment_2_mcp/memory_server
    uv run python server.py

MCP Inspector:
    uv run -- fastmcp dev server.py

Add to Claude Code:
    claude mcp add memory -- uv run --directory segment_2_mcp/memory_server python server.py

Environment variables:
    MCP_MEMORY_PATH  Path to JSON storage (default: ./data/memory.json)
"""

from __future__ import annotations

import json
import os
import secrets
import sys
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastmcp import FastMCP, Context
from pydantic import BaseModel, Field


# =============================================================================
# CONFIGURATION
# =============================================================================

MEMORY_PATH = Path(os.environ.get("MCP_MEMORY_PATH", "./data/memory.json"))


# =============================================================================
# DATA MODELS
# =============================================================================

class Decision(BaseModel):
    """An architectural or design decision worth remembering."""

    id: str
    title: str
    description: str
    rationale: str
    date: str
    tags: list[str] = []


class Convention(BaseModel):
    """A coding convention or team standard."""

    id: str
    name: str
    rule: str
    examples: list[str] = []
    category: str = "general"


class Note(BaseModel):
    """A freeform note — anything worth saving."""

    id: str
    title: str
    content: str
    date: str
    tags: list[str] = []


class Memory(BaseModel):
    """The complete memory store, persisted as JSON."""

    decisions: list[Decision] = []
    conventions: list[Convention] = []
    notes: list[Note] = []
    context: dict[str, str] = {}
    last_updated: str = ""


# =============================================================================
# PERSISTENCE HELPERS
# =============================================================================

def _load(path: Path) -> Memory:
    """Load memory from disk, or create empty memory if missing."""
    if path.exists():
        try:
            return Memory.model_validate_json(path.read_text(encoding="utf-8"))
        except Exception as exc:
            print(f"Warning: corrupt memory file, starting fresh: {exc}", file=sys.stderr)
    return Memory()


def _save(memory: Memory, path: Path) -> None:
    """Write memory to disk as pretty-printed JSON."""
    memory.last_updated = datetime.now(timezone.utc).isoformat()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(memory.model_dump_json(indent=2), encoding="utf-8")


def _id() -> str:
    """Short unique identifier: unix-timestamp + 4 random hex bytes."""
    return f"{int(datetime.now(timezone.utc).timestamp())}-{secrets.token_hex(4)}"


# =============================================================================
# APPLICATION STATE + LIFESPAN
# =============================================================================

@dataclass
class AppState:
    """Shared state available to every tool via ``ctx.state``."""

    memory: Memory
    path: Path


@asynccontextmanager
async def lifespan(server: FastMCP):
    """Load memory on startup, save on shutdown."""
    mem = _load(MEMORY_PATH)
    print(
        f"Loaded: {len(mem.decisions)} decisions, "
        f"{len(mem.conventions)} conventions, {len(mem.notes)} notes",
        file=sys.stderr,
    )
    yield AppState(memory=mem, path=MEMORY_PATH)
    _save(mem, MEMORY_PATH)
    print("Memory saved on shutdown.", file=sys.stderr)


# =============================================================================
# SERVER INSTANCE
# =============================================================================

mcp = FastMCP(
    name="memory",
    instructions=(
        "Persistent memory server. Use its tools to save and recall "
        "decisions, conventions, notes, and key-value context across sessions."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# =============================================================================
# TOOLS — Actions the LLM can execute
# =============================================================================

# ── Decisions ────────────────────────────────────────────────────────────────

@mcp.tool(
    name="remember_decision",
    description=(
        "Record an architectural or design decision. "
        "Use this when the team agrees on a technology choice, pattern, "
        "or significant direction change."
    ),
)
async def remember_decision(
    ctx: Context,
    title: str = Field(description="One-line summary, e.g. 'Use PostgreSQL for user data'"),
    description: str = Field(description="Full description of what was decided"),
    rationale: str = Field(description="Why this decision was made — trade-offs, constraints"),
    tags: list[str] = Field(default=[], description="Categorization tags, e.g. ['database', 'backend']"),
) -> str:
    state: AppState = ctx.state
    decision = Decision(
        id=_id(), title=title, description=description,
        rationale=rationale, date=datetime.now(timezone.utc).isoformat(), tags=tags,
    )
    state.memory.decisions.append(decision)
    _save(state.memory, state.path)
    return f"Decision saved: '{title}' (ID: {decision.id})"


@mcp.tool(
    name="recall_decisions",
    description=(
        "Search past decisions by keyword or tag. "
        "Returns matching decisions as JSON."
    ),
)
async def recall_decisions(
    ctx: Context,
    query: str = Field(default="", description="Full-text search across title, description, tags"),
    tag: str = Field(default="", description="Filter to decisions with this tag"),
    limit: int = Field(default=10, ge=1, le=100, description="Max results"),
) -> list[dict[str, Any]]:
    state: AppState = ctx.state
    results = list(state.memory.decisions)

    if tag:
        t = tag.lower()
        results = [d for d in results if any(t in x.lower() for x in d.tags)]
    if query:
        q = query.lower()
        results = [
            d for d in results
            if q in d.title.lower() or q in d.description.lower()
            or any(q in x.lower() for x in d.tags)
        ]
    return [d.model_dump() for d in results[:limit]]


# ── Conventions ──────────────────────────────────────────────────────────────

@mcp.tool(
    name="add_convention",
    description=(
        "Record a coding convention or team standard. "
        "Include a clear rule and examples so it's actionable."
    ),
)
async def add_convention(
    ctx: Context,
    name: str = Field(description="Convention name, e.g. 'Immutable objects'"),
    rule: str = Field(description="The rule in one sentence: 'Always spread, never mutate'"),
    examples: list[str] = Field(default=[], description="Code snippets showing correct usage"),
    category: str = Field(default="general", description="Category: naming, structure, testing, style"),
) -> str:
    state: AppState = ctx.state
    conv = Convention(id=_id(), name=name, rule=rule, examples=examples, category=category)
    state.memory.conventions.append(conv)
    _save(state.memory, state.path)
    return f"Convention saved: '{name}' [{category}]"


@mcp.tool(
    name="get_conventions",
    description="List all conventions, optionally filtered by category.",
)
async def get_conventions(
    ctx: Context,
    category: str = Field(default="", description="Filter by category (partial match)"),
) -> list[dict[str, Any]]:
    state: AppState = ctx.state
    results = list(state.memory.conventions)
    if category:
        c = category.lower()
        results = [x for x in results if c in x.category.lower()]
    return [x.model_dump() for x in results]


# ── Notes ────────────────────────────────────────────────────────────────────

@mcp.tool(
    name="save_note",
    description=(
        "Save a freeform note — meeting minutes, research findings, "
        "context worth remembering. This is the 'remember this' tool."
    ),
)
async def save_note(
    ctx: Context,
    title: str = Field(description="Short descriptive title"),
    content: str = Field(description="Note body (markdown supported)"),
    tags: list[str] = Field(default=[], description="Tags for search, e.g. ['meeting', 'backend']"),
) -> str:
    state: AppState = ctx.state
    note = Note(
        id=_id(), title=title, content=content,
        date=datetime.now(timezone.utc).isoformat(), tags=tags,
    )
    state.memory.notes.append(note)
    _save(state.memory, state.path)
    return f"Note saved: '{title}' (ID: {note.id})"


@mcp.tool(
    name="search_notes",
    description="Search notes by keyword across title, content, and tags.",
)
async def search_notes(
    ctx: Context,
    query: str = Field(description="Search term"),
) -> list[dict[str, Any]]:
    state: AppState = ctx.state
    q = query.lower()
    results = [
        n for n in state.memory.notes
        if q in n.title.lower() or q in n.content.lower()
        or any(q in t.lower() for t in n.tags)
    ]
    return [n.model_dump() for n in results]


# ── Context (key-value) ─────────────────────────────────────────────────────

@mcp.tool(
    name="set_context",
    description="Store a key-value pair. Useful for project metadata like 'primary_language=TypeScript'.",
)
async def set_context(
    ctx: Context,
    key: str = Field(description="Key name"),
    value: str = Field(description="Value to store"),
) -> str:
    state: AppState = ctx.state
    state.memory.context[key] = value
    _save(state.memory, state.path)
    return f"Context set: {key} = {value}"


@mcp.tool(
    name="get_context",
    description="Retrieve one key or the entire context dictionary.",
)
async def get_context(
    ctx: Context,
    key: str = Field(default="", description="Key to look up (empty = return all)"),
) -> dict[str, str] | str:
    state: AppState = ctx.state
    if key:
        return state.memory.context.get(key, f"Key not found: {key}")
    return dict(state.memory.context)


# ── Summary ──────────────────────────────────────────────────────────────────

@mcp.tool(
    name="memory_summary",
    description="Get a quick overview: counts of decisions, conventions, notes, and context keys.",
)
async def memory_summary(ctx: Context) -> dict[str, Any]:
    state: AppState = ctx.state
    return {
        "decisions": len(state.memory.decisions),
        "conventions": len(state.memory.conventions),
        "notes": len(state.memory.notes),
        "context_keys": list(state.memory.context.keys()),
        "last_updated": state.memory.last_updated or "never",
    }


# =============================================================================
# RESOURCES — Read-only data the LLM can pull into context
# =============================================================================

@mcp.resource(
    "memory://decisions",
    name="All Decisions",
    description="Every architectural/design decision stored in memory, as JSON.",
    mime_type="application/json",
)
async def resource_decisions(ctx: Context) -> str:
    state: AppState = ctx.state
    return json.dumps([d.model_dump() for d in state.memory.decisions], indent=2)


@mcp.resource(
    "memory://conventions",
    name="All Conventions",
    description="Every coding convention/team standard stored in memory, as JSON.",
    mime_type="application/json",
)
async def resource_conventions(ctx: Context) -> str:
    state: AppState = ctx.state
    return json.dumps([c.model_dump() for c in state.memory.conventions], indent=2)


@mcp.resource(
    "memory://notes",
    name="All Notes",
    description="Every freeform note stored in memory, as JSON.",
    mime_type="application/json",
)
async def resource_notes(ctx: Context) -> str:
    state: AppState = ctx.state
    return json.dumps([n.model_dump() for n in state.memory.notes], indent=2)


@mcp.resource(
    "memory://context",
    name="Project Context",
    description="Key-value pairs representing project metadata and configuration.",
    mime_type="application/json",
)
async def resource_context(ctx: Context) -> str:
    state: AppState = ctx.state
    return json.dumps(dict(state.memory.context), indent=2)


@mcp.resource(
    "memory://summary",
    name="Memory Summary",
    description="Quick stats: item counts, last-updated timestamp.",
    mime_type="application/json",
)
async def resource_summary(ctx: Context) -> str:
    state: AppState = ctx.state
    return json.dumps({
        "decisions": len(state.memory.decisions),
        "conventions": len(state.memory.conventions),
        "notes": len(state.memory.notes),
        "context_keys": len(state.memory.context),
        "last_updated": state.memory.last_updated or "never",
    }, indent=2)


# =============================================================================
# PROMPTS — Reusable templates the LLM can invoke
# =============================================================================

@mcp.prompt(
    name="decision_record",
    description=(
        "Generate a structured Architecture Decision Record (ADR). "
        "Helps the team analyze options and document the rationale."
    ),
)
def prompt_decision_record(
    topic: str = Field(description="What the decision is about"),
    options: str = Field(description="Comma-separated list of options being considered"),
    constraints: str = Field(default="", description="Known constraints or requirements"),
) -> str:
    parts = [
        f"I need to make an architectural decision about: **{topic}**",
        f"\n## Options\n{options}",
    ]
    if constraints:
        parts.append(f"\n## Constraints\n{constraints}")
    parts.append("""
## Analysis Requested
For each option, evaluate:
1. **Technical Fit** — Does it solve the problem well?
2. **Complexity** — Implementation and ongoing maintenance cost
3. **Team Impact** — Learning curve for the team
4. **Scalability** — How does it handle 10x growth?
5. **Reversibility** — How costly is it to change later?

Then provide a **Recommendation** with rationale, **Risks**, and **Next Steps**.

Format as an ADR suitable for storing with `remember_decision`.""")
    return "\n".join(parts)


@mcp.prompt(
    name="convention_proposal",
    description=(
        "Draft a new coding convention with rule, examples, and enforcement plan."
    ),
)
def prompt_convention_proposal(
    name: str = Field(description="Convention name, e.g. 'Immutable data patterns'"),
    problem: str = Field(description="The problem this convention prevents"),
) -> str:
    return f"""Propose a coding convention: **{name}**

## Problem
{problem}

Please define:
1. **Rule** — One sentence: what to always/never do
2. **Rationale** — Why this matters (bugs prevented, readability, etc.)
3. **Good Examples** — 2-3 code snippets showing correct usage
4. **Bad Examples** — 2-3 code snippets showing what to avoid
5. **Exceptions** — When it's OK to deviate
6. **Enforcement** — Linter rule, PR checklist, or automated check

Format so it can be saved with `add_convention`."""


@mcp.prompt(
    name="memory_review",
    description=(
        "Review everything in memory and surface insights, gaps, and conflicts."
    ),
)
def prompt_memory_review() -> str:
    return """Review the project memory using these resources:
- memory://decisions
- memory://conventions
- memory://notes
- memory://context

Provide:
1. **Decisions Summary** — Key decisions and whether any are outdated
2. **Convention Health** — Are conventions clear and consistent?
3. **Knowledge Gaps** — What's missing that should be documented?
4. **Conflicts** — Any decisions or conventions that contradict each other?
5. **Recommendations** — Concrete next steps to improve the knowledge base

Format as a structured report."""


@mcp.prompt(
    name="onboarding_guide",
    description=(
        "Generate a new-team-member onboarding doc from stored memory."
    ),
)
def prompt_onboarding_guide(
    role: str = Field(default="developer", description="Role: developer, designer, PM, etc."),
) -> str:
    return f"""A new **{role}** is joining the project.

Using the memory resources, create a friendly onboarding guide covering:
1. **Must-Know Decisions** — The 3-5 most important architectural choices
2. **Coding Standards** — Conventions they need to follow from day one
3. **Project Context** — Background info that isn't obvious from the code
4. **Gotchas** — Common pitfalls captured in notes
5. **Quick Reference** — Key-value context entries they should know about

Keep it concise and actionable — this is their first-day reading."""


# =============================================================================
# ENTRY POINT
# =============================================================================

def main():
    """Run the server on stdio transport."""
    print("Memory MCP Server v1.0.0", file=sys.stderr)
    print(f"Storage: {MEMORY_PATH.absolute()}", file=sys.stderr)
    print("Transport: stdio", file=sys.stderr)
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
