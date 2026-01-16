# hello-world-mcp-server

A FastMCP server

## Installation

```bash
# Install dependencies
pip install -r requirements.txt
```

## Usage

### Run Standalone

```bash
python server.py
```

### Add to Claude Code

```bash
claude mcp add hello-world-mcp-server -- python server.py
```

## Tools

| Tool | Description |
|------|-------------|
| `create_item` | Create a new item |
| `list_items` | List all items |
| `get_item` | Get item by ID |
| `delete_item` | Delete item by ID |
| `set_metadata` | Set metadata key-value |
| `get_metadata` | Get metadata |

## Resources

| URI | Description |
|-----|-------------|
| `hello-world-mcp-server://items` | All items as JSON |
| `hello-world-mcp-server://metadata` | All metadata |
| `hello-world-mcp-server://summary` | Storage summary |
| `hello-world-mcp-server://items/{id}` | Specific item by ID |

## Prompts

| Prompt | Description |
|--------|-------------|
| `analyze_items` | Request item analysis |
| `create_item_template` | Template for creating items |

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `HELLO_WORLD_MCP_SERVER_DATA_PATH` | `./data/hello-world-mcp-server.json` | Path to data file |

## License

MIT
