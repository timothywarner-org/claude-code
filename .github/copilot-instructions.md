# Claude Code AI Agent Instructions

This document provides essential guidance for AI coding agents working in the Claude Code repository. It outlines the architecture, workflows, and conventions to ensure productive contributions.

## Project Overview
Claude Code is a training repository for mastering Claude Code CLI, MCP servers, agentic workflows, and custom skills. It uses:
- **TypeScript/JavaScript**: For CLI tools and agent workflows.
- **Python**: For MCP server implementations.

Key components include:
- **Claude Code CLI**: Terminal-based workflows for code review, refactoring, and automation.
- **MCP Memory Server**: Persistent memory for decisions, entities, and relationships.
- **Custom Skills**: Reusable slash commands for team automation.
- **Agent Workflows**: Multi-step autonomous operations.

## Repository Structure
- `src/`: Core Python-based MCP server implementation.
  - `memory_server.py`: Main FastMCP server with tools and resources.
  - `data/`: JSON files for memory persistence.
- `segment_*`: Training segments for Claude Code CLI, MCP, agents, and skills.
- `scripts/`: Utility scripts for setup, security, and documentation.
- `tests/`: Exercises and solutions for each training segment.

## Development Workflows
### Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Verify environment:
   ```bash
   npm run verify
   ```

### Build and Run
- Build TypeScript:
  ```bash
  npm run build
  ```
- Run demo files:
  ```bash
  npx tsx <path-to-file.ts>
  ```

### Key Commands
- **Segment 1**: Quick Start
  ```bash
  npm run segment1:verify      # Verify API setup
  npm run segment1:workflows   # Terminal workflow demos
  ```
- **Segment 2**: MCP
  ```bash
  npm run segment2:architecture  # MCP architecture visualization
  npm run segment2:memory        # Start memory server
  ```
- **Segment 3**: Agents
  ```bash
  npm run segment3:agent-loop   # Agent loop demonstration
  npm run segment3:boundaries   # Permission boundaries demo
  ```
- **Segment 4**: Skills + Agents
  ```bash
  npm run segment4:workflows    # Production workflow demos
  ```

## Conventions
- **TypeScript**: Follow strict typing and modular design.
- **Python**: Use FastAPI conventions for MCP servers.
- **JSON Data**: Store memory items in `src/data/`.
- **Testing**: Exercises are in `tests/` with solutions and starters.

## Integration Points
- **Anthropic API**: Used for Claude Code CLI and demos.
- **GitHub Workflows**: Automate CI/CD for production workflows.

## Examples
- **Memory Server**: See `src/memory_server.py` for resource and tool definitions.
- **Agent Workflows**: Refer to `segment_3_agents/` for agentic loops and boundaries.

For further details, consult `README.md` and `CLAUDE.md`.
