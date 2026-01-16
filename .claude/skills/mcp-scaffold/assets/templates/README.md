# {{SERVER_NAME}}

{{DESCRIPTION}}

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
claude mcp add {{SERVER_NAME}} -- python server.py
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
| `{{SERVER_NAME}}://items` | All items as JSON |
| `{{SERVER_NAME}}://metadata` | All metadata |
| `{{SERVER_NAME}}://summary` | Storage summary |
| `{{SERVER_NAME}}://items/{id}` | Specific item by ID |

## Prompts

| Prompt | Description |
|--------|-------------|
| `analyze_items` | Request item analysis |
| `create_item_template` | Template for creating items |

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `{{SERVER_NAME_UPPER}}_DATA_PATH` | `./data/{{SERVER_NAME}}.json` | Path to data file |

## License

MIT
