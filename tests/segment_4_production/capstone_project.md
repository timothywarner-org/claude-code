# Capstone Project: Production AI Development Pipeline

## Overview

Build a complete, production-ready AI development pipeline that integrates all concepts from
the course: large context handling, MCP servers, Claude Code CLI, and CI/CD automation.

**Time Estimate**: 3-4 hours
**Difficulty**: Advanced
**Prerequisites**: All previous segments completed

## Project Description

Create an **AI-Powered Code Review and Documentation System** that:

1. Monitors a GitHub repository for changes
2. Performs intelligent code review using Claude's 200K context
3. Generates and updates documentation automatically
4. Maintains project memory across sessions via MCP
5. Optimizes API costs while maintaining quality

## Learning Objectives

Upon completion, you will demonstrate mastery of:

1. Full-codebase analysis with 200K context window
2. Custom MCP server development and integration
3. Claude Code CLI automation patterns
4. GitHub Actions CI/CD integration
5. Production cost optimization
6. Error handling and monitoring

## Project Requirements

### Part 1: MCP Memory Server (30 points)

Create an MCP server that persists project context:

**Required Features:**

- [ ] Store code patterns and conventions discovered in the codebase
- [ ] Track review history and recurring issues
- [ ] Maintain a "project knowledge base" with architecture decisions
- [ ] Support namespaced storage for multi-project use
- [ ] Implement data expiration for stale information

**Deliverables:**

- `mcp-project-memory/server.ts` - Complete MCP server
- `mcp-project-memory/package.json` - Dependencies
- Documentation of all exposed tools

### Part 2: Code Review Automation (25 points)

Build a GitHub Actions workflow for automated reviews:

**Required Features:**

- [ ] Trigger on PR creation and updates
- [ ] Analyze changed files using full codebase context
- [ ] Post structured review comments
- [ ] Label PRs based on review severity
- [ ] Block merge on critical issues

**Deliverables:**

- `.github/workflows/ai-review.yml` - Complete workflow
- `scripts/review-runner.ts` - Review orchestration script
- Configuration for customizing review behavior

### Part 3: Documentation Generator (25 points)

Create an automated documentation system:

**Required Features:**

- [ ] Analyze codebase structure and generate overview
- [ ] Create/update API documentation from code
- [ ] Generate architecture diagrams (Mermaid)
- [ ] Maintain changelog from commit history
- [ ] Update README sections automatically

**Deliverables:**

- `scripts/doc-generator.ts` - Documentation generator
- Template files for documentation structure
- Integration with CI/CD pipeline

### Part 4: Cost Optimization Layer (20 points)

Implement production-ready cost management:

**Required Features:**

- [ ] Token counting and cost estimation
- [ ] Budget enforcement with alerts
- [ ] Intelligent model selection based on task
- [ ] Response caching to reduce duplicate calls
- [ ] Usage dashboard/reporting

**Deliverables:**

- `lib/cost-manager.ts` - Cost management module
- Budget configuration file
- Usage reporting script

## Technical Specifications

### MCP Server Requirements

```typescript
// Required tools
interface ProjectMemoryTools {
  // Store discovered patterns
  store_pattern: (params: { name: string; pattern: string; examples: string[] }) => void;

  // Get relevant patterns for current context
  get_patterns: (params: { context: string; limit?: number }) => Pattern[];

  // Store review feedback
  store_review: (params: { file: string; issue: string; resolution?: string }) => void;

  // Get review history for a file
  get_review_history: (params: { file: string }) => ReviewRecord[];

  // Store architecture decision
  store_decision: (params: { title: string; context: string; decision: string; consequences: string[] }) => void;

  // Query decisions
  query_decisions: (params: { topic: string }) => Decision[];
}
```

### GitHub Actions Requirements

```yaml
# Minimum workflow structure
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  context-analysis:
    # Load full codebase context

  code-review:
    # Run Claude review with MCP memory

  documentation-check:
    # Verify/update documentation

  cost-reporting:
    # Log usage and costs
```

### Documentation Generator Requirements

```typescript
// Required output structure
interface Documentation {
  overview: {
    description: string;
    architecture: string; // Mermaid diagram
    technologies: string[];
  };
  api: {
    endpoints: EndpointDoc[];
    types: TypeDoc[];
  };
  changelog: ChangelogEntry[];
  contributing: string;
}
```

## Grading Rubric

### Part 1: MCP Memory Server (30 points)

| Criteria                    | Points | Description                           |
| --------------------------- | ------ | ------------------------------------- |
| Tool implementation         | 10     | All required tools work correctly     |
| Data persistence            | 5      | Data survives server restart          |
| Namespace support           | 5      | Multi-project isolation works         |
| Error handling              | 5      | Graceful error handling               |
| Code quality                | 5      | Clean, documented, typed code         |

### Part 2: Code Review Automation (25 points)

| Criteria                    | Points | Description                            |
| --------------------------- | ------ | -------------------------------------- |
| Workflow triggers           | 5      | Correct event handling                 |
| Context loading             | 5      | Full codebase context used             |
| Review quality              | 5      | Actionable, specific feedback          |
| PR integration              | 5      | Comments, labels, status checks        |
| Error recovery              | 5      | Handles failures gracefully            |

### Part 3: Documentation Generator (25 points)

| Criteria                    | Points | Description                            |
| --------------------------- | ------ | -------------------------------------- |
| Structure analysis          | 5      | Accurate codebase understanding        |
| Documentation quality       | 5      | Clear, comprehensive output            |
| Diagram generation          | 5      | Valid, useful Mermaid diagrams         |
| Changelog generation        | 5      | Accurate commit history parsing        |
| CI/CD integration           | 5      | Automated updates work                 |

### Part 4: Cost Optimization (20 points)

| Criteria                    | Points | Description                            |
| --------------------------- | ------ | -------------------------------------- |
| Token counting              | 5      | Accurate estimation                    |
| Budget enforcement          | 5      | Alerts and limits work                 |
| Model selection             | 5      | Intelligent routing                    |
| Caching                     | 5      | Effective cache implementation         |

### Bonus Points (up to 10)

| Criteria                    | Points | Description                            |
| --------------------------- | ------ | -------------------------------------- |
| Exceptional code quality    | 3      | Outstanding implementation             |
| Creative features           | 3      | Useful additions beyond requirements   |
| Comprehensive testing       | 2      | Unit and integration tests             |
| Security considerations     | 2      | Proper secret handling, input validation |

## Submission Requirements

### Repository Structure

```
capstone-project/
├── mcp-project-memory/
│   ├── server.ts
│   ├── package.json
│   └── README.md
├── .github/
│   └── workflows/
│       └── ai-review.yml
├── scripts/
│   ├── review-runner.ts
│   ├── doc-generator.ts
│   └── cost-reporter.ts
├── lib/
│   └── cost-manager.ts
├── config/
│   ├── review-config.json
│   └── budget-config.json
├── docs/
│   └── (generated documentation)
├── tests/
│   └── (test files)
└── README.md
```

### Documentation Requirements

Your README.md must include:

1. **Project Overview** - What the system does
2. **Architecture** - How components interact (with diagram)
3. **Setup Instructions** - Step-by-step installation
4. **Configuration** - All configurable options
5. **Usage Examples** - Common use cases
6. **Troubleshooting** - Common issues and solutions
7. **Cost Analysis** - Expected costs for different usage patterns

### Demo Requirements

Prepare a demo that shows:

1. MCP server starting and handling requests
2. PR triggering automated review
3. Documentation being generated
4. Cost dashboard showing usage

## Evaluation Process

### Step 1: Automated Checks

- Code compiles without errors
- All dependencies install correctly
- Workflow syntax is valid

### Step 2: Functional Testing

- MCP tools respond correctly
- GitHub Actions run successfully
- Documentation generates accurately

### Step 3: Quality Review

- Code style and organization
- Error handling robustness
- Documentation completeness

### Step 4: Integration Testing

- End-to-end flow works
- Components communicate correctly
- Edge cases handled

## Tips for Success

### Start Early

- Begin with the MCP server (foundation for other parts)
- Test each component in isolation first
- Integrate incrementally

### Focus on Reliability

- Handle API failures gracefully
- Implement retries with backoff
- Log extensively for debugging

### Optimize for Cost

- Use Haiku for simple classification tasks
- Cache responses aggressively
- Limit context to relevant files

### Test Thoroughly

- Create test PRs with known issues
- Verify edge cases (empty PRs, large diffs)
- Test budget limits with mock data

## Resources

### Reference Implementations

- MCP TypeScript SDK examples
- GitHub Actions starter workflows
- Anthropic API documentation

### Helpful Tools

- `@anthropic-ai/tokenizer` - Token counting
- `@octokit/rest` - GitHub API
- `mermaid-cli` - Diagram generation

### Support Channels

- Course Slack channel
- Office hours schedule
- GitHub Discussions

## Frequently Asked Questions

**Q: Can I use existing MCP servers as a base?**
A: You may reference them for patterns, but core implementation must be original.

**Q: What if my API costs exceed expectations?**
A: Use caching and model selection. Contact instructor if you hit budget issues.

**Q: Can I add features beyond requirements?**
A: Absolutely! Bonus points are available for creative additions.

**Q: How do I handle rate limiting?**
A: Implement exponential backoff and queue requests appropriately.

**Q: What models should I use?**
A: Recommended: Haiku for classification, Sonnet for reviews, Opus for complex analysis.
