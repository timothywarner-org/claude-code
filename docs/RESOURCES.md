# Awesome Resources for Claude Code and Large-Context Reasoning

A curated collection of essential documentation, specifications, and best practices for mastering Claude's 200K context window, MCP servers, and production AI workflows.

---

## Table of Contents

- [Anthropic Official Documentation](#anthropic-official-documentation)
- [Model Context Protocol (MCP) Specifications](#model-context-protocol-mcp-specifications)
- [Context Conservation Best Practices](#context-conservation-best-practices)
- [RAG Patterns and Retrieval Strategies](#rag-patterns-and-retrieval-strategies)
- [Claude Code and CLI Resources](#claude-code-and-cli-resources)
- [Microsoft and Azure AI Resources](#microsoft-and-azure-ai-resources)
- [MCP Server Development](#mcp-server-development)
- [Community Resources and Tools](#community-resources-and-tools)

---

## Anthropic Official Documentation

### Core References

| Resource | Description |
|----------|-------------|
| [Claude Documentation](https://docs.anthropic.com/) | Official Claude API documentation and guides |
| [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code) | Complete guide to Claude Code CLI |
| [Anthropic Cookbook](https://github.com/anthropics/anthropic-cookbook) | Production-ready code examples and patterns |
| [Claude API Reference](https://docs.anthropic.com/en/api) | Complete API specification |

### Context Window and Token Management

| Resource | Description |
|----------|-------------|
| [Long Context Window Tips](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) | Strategies for effective use of 200K context |
| [Prompt Caching Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) | Reduce costs and latency with cached prompts |
| [Token Counting](https://docs.anthropic.com/en/docs/build-with-claude/token-counting) | Accurate token estimation techniques |

---

## Model Context Protocol (MCP) Specifications

### Official Specifications

| Resource | Description |
|----------|-------------|
| [MCP Specification (Latest)](https://modelcontextprotocol.io/specification/2025-11-25) | Complete protocol specification (Nov 2025) |
| [MCP Introduction](https://modelcontextprotocol.io/introduction) | Getting started with Model Context Protocol |
| [MCP Architecture](https://modelcontextprotocol.io/docs/concepts/architecture) | Core architecture and design principles |
| [MCP Registry Specification](https://github.com/modelcontextprotocol/registry) | Official MCP server registry spec |

### Protocol Components

| Resource | Description |
|----------|-------------|
| [MCP Tools Specification](https://modelcontextprotocol.io/docs/concepts/tools) | Tool definition and invocation patterns |
| [MCP Resources Specification](https://modelcontextprotocol.io/docs/concepts/resources) | Resource exposure and management |
| [MCP Prompts Specification](https://modelcontextprotocol.io/docs/concepts/prompts) | Templated prompt patterns |
| [MCP Pagination Spec](https://modelcontextprotocol.io/specification/2025-03-26/server/utilities/pagination) | Cursor-based pagination for large datasets |
| [MCP Sampling](https://modelcontextprotocol.io/docs/concepts/sampling) | Server-initiated LLM interactions |

### SDKs and Implementation

| Resource | Description | Benchmark Score |
|----------|-------------|-----------------|
| [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) | Official Python implementation | 89.2 |
| [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | Official TypeScript implementation | 85.3 |
| [MCP Servers Repository](https://github.com/modelcontextprotocol/servers) | Reference server implementations | - |

---

## Context Conservation Best Practices

### Essential Reading

| Resource | Key Insight | Token Savings |
|----------|-------------|---------------|
| [Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp) | Present MCP servers as code APIs instead of direct tool calls | Up to 98.7% |
| [Lazy Loading Input Schemas](https://www.open-mcp.org/blog/lazy-loading-input-schemas) | Partition schemas into single-level chunks, browse hierarchically | 90%+ |
| [Optimizing MCP Server Context Usage](https://scottspence.com/posts/optimising-mcp-server-context-usage-in-claude-code) | Tool consolidation and description trimming | 60% |
| [MCP Strategies for Token-Efficient Context](https://www.k2view.com/blog/mcp-strategies-for-grounded-prompts-and-token-efficient-llm-context/) | Intent-aligned selection, field trimming | 80% |

### Proven Patterns Summary

| Strategy | Implementation | Complexity |
|----------|----------------|------------|
| **Lazy loading tool schemas** | Load tool definitions on-demand, not upfront | Medium |
| **Code execution vs direct calls** | Execute code in sandbox, return only results | High |
| **Tool consolidation** | Merge similar tools (20 tools → 8 tools) | Low |
| **Description trimming** | Single concise sentences instead of paragraphs | Low |
| **ResourceLink dual-response** | Return preview + URI instead of full datasets | Medium |
| **Cursor-based pagination** | Never load complete lists; iterate with cursors | Low |
| **Server-side caching** | TTL-based caching for repeated queries | Low |

### Research Papers

| Resource | Focus |
|----------|-------|
| [Extending ResourceLink: Patterns for Large Dataset Processing](https://arxiv.org/html/2510.05968v1) | Dual-response pattern, lazy loading strategies |
| [SEP-1576: Mitigating Token Bloat in MCP](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1576) | Protocol-level optimizations discussion |

---

## RAG Patterns and Retrieval Strategies

### Architecture and Design

| Resource | Description |
|----------|-------------|
| [Anthropic RAG Guide](https://docs.anthropic.com/en/docs/build-with-claude/retrieval-augmented-generation) | Official RAG implementation guidance |
| [Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval) | Anthropic's enhanced RAG technique |
| [RAG Best Practices](https://docs.anthropic.com/en/docs/build-with-claude/retrieval-augmented-generation#best-practices) | Production RAG patterns |

### Chunking and Embedding Strategies

| Strategy | When to Use |
|----------|-------------|
| **Semantic chunking** | Documents with clear topic boundaries |
| **Fixed-size with overlap** | Uniform content like logs or code |
| **Hierarchical chunking** | Long documents with nested structure |
| **Late chunking** | When context between chunks matters |

### Vector Database Integration

| Resource | Description |
|----------|-------------|
| [Pinecone + Claude](https://docs.pinecone.io/integrations/anthropic) | Vector search with Claude |
| [Weaviate RAG](https://weaviate.io/developers/weaviate/starter-guides/generative) | Generative search patterns |
| [ChromaDB Cookbook](https://cookbook.chromadb.dev/) | Local vector database patterns |

---

## Claude Code and CLI Resources

### Getting Started

| Resource | Description |
|----------|-------------|
| [Claude Code Installation](https://docs.anthropic.com/en/docs/claude-code/getting-started) | Setup and configuration |
| [Claude Code CLI Reference](https://docs.anthropic.com/en/docs/claude-code/cli-reference) | Complete command reference |
| [CLAUDE.md Guide](https://docs.anthropic.com/en/docs/claude-code/memory#project-memory-claudemd) | Project-specific instructions |

### Advanced Features

| Resource | Description |
|----------|-------------|
| [Claude Code Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) | Event-driven automation |
| [MCP in Claude Code](https://docs.anthropic.com/en/docs/claude-code/mcp) | Configuring MCP servers |
| [Custom Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands) | Creating custom workflows |
| [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk) | Programmatic control |

### IDE Integration

| Resource | Description |
|----------|-------------|
| [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code) | Visual Studio Code integration |
| [JetBrains Plugin](https://plugins.jetbrains.com/plugin/claude-code) | IntelliJ/WebStorm integration |

---

## Microsoft and Azure AI Resources

### Azure OpenAI and AI Services

| Resource | Description |
|----------|-------------|
| [Azure OpenAI Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/) | Enterprise AI deployment |
| [Azure AI Search](https://learn.microsoft.com/en-us/azure/search/) | Enterprise RAG infrastructure |
| [Semantic Kernel](https://learn.microsoft.com/en-us/semantic-kernel/) | AI orchestration framework |

### Microsoft Copilot Development

| Resource | Description |
|----------|-------------|
| [Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/) | Low-code copilot building |
| [Microsoft Graph + AI](https://learn.microsoft.com/en-us/graph/api/overview) | Enterprise data integration |

### Azure Best Practices

| Resource | Description |
|----------|-------------|
| [Azure Well-Architected Framework](https://learn.microsoft.com/en-us/azure/well-architected/) | Cloud architecture patterns |
| [Azure AI Best Practices](https://learn.microsoft.com/en-us/azure/ai-services/responsible-use-of-ai-overview) | Responsible AI deployment |

---

## MCP Server Development

### Building MCP Servers

| Resource | Description |
|----------|-------------|
| [MCP Server Quickstart](https://modelcontextprotocol.io/quickstart/server) | Build your first MCP server |
| [MCP Server Examples](https://github.com/modelcontextprotocol/servers) | Reference implementations |
| [FastMCP (Python)](https://github.com/jlowin/fastmcp) | High-level Python framework |

### Caching and Performance

| Resource | Description |
|----------|-------------|
| [mcp-cache](https://lobehub.com/mcp/swapnilsurdi-mcp-cache) | Universal response caching wrapper |
| [Memory Cache Server](https://playbooks.com/mcp/tosin2013-memory-cache) | Cross-interaction caching |
| [MCP API Gateway Patterns](https://www.gravitee.io/blog/mcp-api-gateway-explained-protocols-caching-and-remote-server-integration) | Gateway-level optimization |

### Popular MCP Servers

| Server | Purpose |
|--------|---------|
| [filesystem](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem) | Local file operations |
| [github](https://github.com/modelcontextprotocol/servers/tree/main/src/github) | GitHub API integration |
| [postgres](https://github.com/modelcontextprotocol/servers/tree/main/src/postgres) | PostgreSQL queries |
| [memory](https://github.com/modelcontextprotocol/servers/tree/main/src/memory) | Persistent knowledge graphs |

---

## Community Resources and Tools

### MCP Registries and Directories

| Resource | Description |
|----------|-------------|
| [MCP Hub](https://mcphub.io/) | Community MCP server directory |
| [Smithery](https://smithery.ai/) | MCP server marketplace |
| [LobeHub MCP](https://lobehub.com/mcp) | Curated MCP collection |

### Learning Resources

| Resource | Description |
|----------|-------------|
| [MCP Blog](https://blog.modelcontextprotocol.io/) | Official updates and tutorials |
| [One Year of MCP](https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/) | Protocol evolution and milestones |
| [Anthropic Engineering Blog](https://www.anthropic.com/engineering) | Deep technical articles |

### GitHub Discussions

| Resource | Topic |
|----------|-------|
| [Claude Code Issues](https://github.com/anthropics/claude-code/issues) | Feature requests and bugs |
| [MCP Protocol Discussions](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions) | Protocol design discussions |
| [Feature: Lazy Loading #7336](https://github.com/anthropics/claude-code/issues/7336) | Context reduction strategies |

---

## Quick Reference: Token Reduction Strategies

```
+----------------------------------+------------------+------------+
| Strategy                         | Token Reduction  | Effort     |
+----------------------------------+------------------+------------+
| Code execution over direct calls | Up to 98.7%      | High       |
| Lazy loading schemas             | 90-95%           | Medium     |
| ResourceLink dual-response       | 70-80%           | Medium     |
| Tool consolidation               | 60%              | Low        |
| Description trimming             | 30-50%           | Low        |
| Cursor-based pagination          | Prevents bloat   | Low        |
+----------------------------------+------------------+------------+
```

---

## Contributing

Found a great resource? Submit a PR to add it to this list!

---

Last updated: January 2026
