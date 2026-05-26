# oreilly-claude-course plugin

A Claude Code **plugin** that bundles every custom skill and subagent from the O'Reilly Live Learning course *Claude Code and Large-Context Reasoning* into one installable package.

This is the **plugin scope** tier from the four-tier skill hierarchy taught in `segment_4_hero/01_skills_intro.md`:

| Scope | Path | Applies to |
|-------|------|------------|
| Enterprise | Managed settings | All users in your org |
| Personal | `~/.claude/skills/<name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<name>/SKILL.md` | This project only |
| **Plugin** | `<plugin>/skills/<name>/SKILL.md` | **Wherever the plugin is enabled** |

Plugin skills are namespaced. Once installed, the three skills bundled here load as:

- `oreilly-claude-course:mcp-scaffold`
- `oreilly-claude-course:review-changes`
- `oreilly-claude-course:claude-md-audit`

## What's bundled

### Skills (3)

| Skill | Purpose |
|-------|---------|
| `mcp-scaffold` | Generate production-ready Python MCP servers with FastMCP. Includes templates, validators, and reference docs. |
| `review-changes` | Review uncommitted changes for bugs, missing tests, and CLAUDE.md voice violations. Dynamic context injection example. |
| `claude-md-audit` | Audit the CLAUDE.md hierarchy. Includes a Python audit script and a reference doc. Progressive disclosure example. |

### Subagents (5)

| Agent | Purpose |
|-------|---------|
| `code-quality-coach` | Senior developer mentor for code reviews, teaches through the Socratic method. |
| `claude-code-tutor` | Interactive instructor for Claude Code concepts (MCP, skills, agents, hooks). |
| `python-mcp-expert` | Expert guide for building Python MCP servers with FastMCP. |
| `release-manager` | DevOps specialist for release prep, version bumping, and changelog generation. |
| `terraform-architect` | Terraform IaC expert for Azure and GCP infrastructure. |

## Install

### Option 1: local plugin (development)

Point Claude Code at this directory:

```bash
claude plugin install ./plugins/oreilly-claude-course
```

Or, from outside the repo:

```bash
claude plugin install /path/to/claude-code/plugins/oreilly-claude-course
```

### Option 2: marketplace distribution

Publish this directory as a Claude Code marketplace entry. The `.claude-plugin/plugin.json` manifest is the entry point.

## Verify the install

After installing, in any Claude Code session:

```text
/help
```

You should see the three skills under `oreilly-claude-course:` namespace and the five agents available for `Agent` tool dispatch.

Quick smoke test for each artifact:

| Artifact | Test |
|----------|------|
| `mcp-scaffold` | `/mcp-scaffold` then ask it to generate a hello-world server. |
| `review-changes` | Edit a file in any repo, then `/review-changes`. |
| `claude-md-audit` | Run inside a repo that has a `CLAUDE.md`. |
| `code-quality-coach` | Ask Claude to "review this code with the code quality coach". |
| `terraform-architect` | Ask Claude to "review this Terraform module". |

## Source of truth

The canonical copies of these artifacts live in `.claude/skills/` and `.claude/agents/` at the repo root. The files in this plugin folder are **copies** made for distribution. When you update a skill or agent, update the canonical copy first, then refresh this plugin folder. A future iteration could automate this with a `package-plugin.ps1` script.

## License

MIT. See the repo root `LICENSE` file for full text.

## Author

Tim Warner. Microsoft MVP (Azure AI), Principal Staff Author at Pluralsight, O'Reilly Live Learning instructor. Built for the May 26 2026 cohort of *Claude Code and Large-Context Reasoning*.
