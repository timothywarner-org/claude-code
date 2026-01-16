#!/usr/bin/env python3
"""
MCP Server Scaffolding Script

Generates a new Python MCP server project with FastMCP.

Usage:
    python scaffold.py <server-name> [options]

Options:
    --output, -o    Output directory (default: ./<server-name>)
    --template, -t  Template: basic, full (default: full)
    --tools         Include tools (default: true)
    --resources     Include resources (default: true for full)
    --prompts       Include prompts (default: true for full)
    --lifespan      Include lifespan management (default: true for full)

Examples:
    python scaffold.py my-server
    python scaffold.py my-server --template basic
    python scaffold.py my-server --output ./servers/my-server
    python scaffold.py my-server --tools --resources --no-prompts
"""

import argparse
import re
import sys
from pathlib import Path


def validate_name(name: str) -> bool:
    """Validate server name (lowercase, letters, numbers, hyphens)."""
    return bool(re.match(r'^[a-z][a-z0-9-]*$', name))


def to_upper_snake(name: str) -> str:
    """Convert server-name to SERVER_NAME."""
    return name.upper().replace('-', '_')


def load_template(template_name: str) -> str:
    """Load template from assets directory."""
    # Get the script's directory
    script_dir = Path(__file__).parent.parent
    template_path = script_dir / "assets" / "templates" / template_name

    if not template_path.exists():
        print(f"Error: Template not found: {template_path}", file=sys.stderr)
        sys.exit(1)

    return template_path.read_text(encoding="utf-8")


def apply_substitutions(content: str, name: str, description: str) -> str:
    """Apply template substitutions."""
    return content.replace(
        "{{SERVER_NAME}}", name
    ).replace(
        "{{SERVER_NAME_UPPER}}", to_upper_snake(name)
    ).replace(
        "{{DESCRIPTION}}", description
    )


def scaffold(
    name: str,
    output: Path,
    template: str,
    description: str,
) -> None:
    """Generate MCP server project."""

    # Validate name
    if not validate_name(name):
        print(f"Error: Invalid server name '{name}'", file=sys.stderr)
        print("Name must start with lowercase letter, contain only lowercase letters, numbers, and hyphens", file=sys.stderr)
        sys.exit(1)

    # Check output directory
    if output.exists():
        print(f"Error: Output directory already exists: {output}", file=sys.stderr)
        sys.exit(1)

    # Create output directory
    output.mkdir(parents=True)
    print(f"Created directory: {output}")

    # Select template
    if template == "basic":
        server_template = "basic-server.py"
    else:
        server_template = "full-server.py"

    # Generate server.py
    server_content = load_template(server_template)
    server_content = apply_substitutions(server_content, name, description)
    (output / "server.py").write_text(server_content, encoding="utf-8")
    print(f"Created: {output / 'server.py'}")

    # Generate requirements.txt
    requirements_content = load_template("requirements.txt")
    requirements_content = apply_substitutions(requirements_content, name, description)
    (output / "requirements.txt").write_text(requirements_content, encoding="utf-8")
    print(f"Created: {output / 'requirements.txt'}")

    # Generate README.md
    readme_content = load_template("README.md")
    readme_content = apply_substitutions(readme_content, name, description)
    (output / "README.md").write_text(readme_content, encoding="utf-8")
    print(f"Created: {output / 'README.md'}")

    # Create data directory
    data_dir = output / "data"
    data_dir.mkdir()
    (data_dir / ".gitkeep").touch()
    print(f"Created: {data_dir}")

    # Create .gitignore
    gitignore_content = """# Python
__pycache__/
*.py[cod]
.venv/
venv/

# Data
data/*.json
!data/.gitkeep

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
"""
    (output / ".gitignore").write_text(gitignore_content, encoding="utf-8")
    print(f"Created: {output / '.gitignore'}")

    # Summary
    print()
    print("=" * 50)
    print(f"MCP Server '{name}' scaffolded successfully!")
    print("=" * 50)
    print()
    print("Next steps:")
    print(f"  1. cd {output}")
    print("  2. pip install -r requirements.txt")
    print("  3. python server.py")
    print()
    print("Add to Claude Code:")
    print(f"  claude mcp add {name} -- python {output.absolute()}/server.py")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Scaffold a new Python MCP server",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s my-server
  %(prog)s my-server --template basic
  %(prog)s my-server -o ./servers/my-server
  %(prog)s data-service --description "Data processing server"
        """
    )

    parser.add_argument(
        "name",
        help="Server name (lowercase, letters/numbers/hyphens)"
    )
    parser.add_argument(
        "--output", "-o",
        type=Path,
        default=None,
        help="Output directory (default: ./<server-name>)"
    )
    parser.add_argument(
        "--template", "-t",
        choices=["basic", "full"],
        default="full",
        help="Template type (default: full)"
    )
    parser.add_argument(
        "--description", "-d",
        default="A FastMCP server",
        help="Server description"
    )

    args = parser.parse_args()

    # Set default output
    output = args.output or Path(f"./{args.name}")

    scaffold(
        name=args.name,
        output=output,
        template=args.template,
        description=args.description,
    )


if __name__ == "__main__":
    main()
