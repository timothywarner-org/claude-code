#!/bin/bash
# setup.sh - Virtual Environment Setup Script for Copilot Tips MCP Server
# Secondary bootstrap script for macOS/Linux users
#
# Usage:
#   ./setup.sh           - Create venv and install dependencies
#   ./setup.sh --force   - Recreate venv from scratch
#   ./setup.sh --activate - Only activate existing venv (source this!)
#
# Note: To activate the venv, you need to SOURCE this script:
#   source ./setup.sh --activate

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"
VENV_ACTIVATE="$VENV_DIR/bin/activate"
VENV_PYTHON="$VENV_DIR/bin/python"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  Memory MCP Server - Environment Setup${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# Parse arguments
FORCE=false
ACTIVATE_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE=true
            shift
            ;;
        --activate|-a)
            ACTIVATE_ONLY=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Check if just activating
if [ "$ACTIVATE_ONLY" = true ]; then
    if [ -f "$VENV_ACTIVATE" ]; then
        echo -e "${GREEN}Activating virtual environment...${NC}"
        source "$VENV_ACTIVATE"
        echo ""
        echo -e "${GREEN}Virtual environment activated!${NC}"
        echo -e "${GRAY}Python: $VENV_PYTHON${NC}"
        # Don't exit - let the shell continue with activated venv
    else
        echo -e "${RED}ERROR: Virtual environment not found at $VENV_DIR${NC}"
        echo -e "${YELLOW}Run ./setup.sh without --activate to create it first.${NC}"
        exit 1
    fi
    return 0 2>/dev/null || exit 0
fi

# Check Python is available
echo -e "${YELLOW}Checking Python installation...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo -e "${RED}ERROR: Python not found in PATH${NC}"
    echo -e "${YELLOW}Please install Python 3.10+ from https://python.org${NC}"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
echo -e "${GRAY}   Found: $PYTHON_VERSION${NC}"

# Remove existing venv if Force flag is set
if [ "$FORCE" = true ] && [ -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}Removing existing virtual environment...${NC}"
    rm -rf "$VENV_DIR"
    echo -e "${GRAY}   Done${NC}"
fi

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo ""
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    $PYTHON_CMD -m venv "$VENV_DIR"
    echo -e "${GRAY}   Created at: $VENV_DIR${NC}"
else
    echo ""
    echo -e "${GREEN}Virtual environment already exists${NC}"
    echo -e "${GRAY}   Location: $VENV_DIR${NC}"
    echo -e "${GRAY}   Use --force to recreate it${NC}"
fi

# Activate and install dependencies
echo ""
echo -e "${YELLOW}Activating virtual environment...${NC}"
source "$VENV_ACTIVATE"

echo ""
echo -e "${YELLOW}Upgrading pip...${NC}"
"$VENV_PYTHON" -m pip install --upgrade pip --quiet

echo ""
echo -e "${YELLOW}Installing dependencies from pyproject.toml...${NC}"
"$VENV_PYTHON" -m pip install -e ".[dev]" --quiet
echo -e "${GRAY}   Done${NC}"

# Verify installation
echo ""
echo -e "${YELLOW}Verifying installation...${NC}"
FASTMCP_VERSION=$("$VENV_PYTHON" -c "import fastmcp; print(fastmcp.__version__)" 2>/dev/null || echo "installed")
echo -e "${GRAY}   fastmcp: $FASTMCP_VERSION${NC}"

MCP_VERSION=$("$VENV_PYTHON" -c "import mcp; print(mcp.__version__)" 2>/dev/null || echo "installed")
echo -e "${GRAY}   mcp: $MCP_VERSION${NC}"

# Success message
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${CYAN}The virtual environment is now activated in this terminal.${NC}"
echo ""
echo -e "${YELLOW}Quick Commands:${NC}"
echo -e "${GRAY}   Run the server:      python copilot_tips_server.py${NC}"
echo -e "${GRAY}   Start inspector:     python start_inspector.py${NC}"
echo -e "${GRAY}   Activate later:      source ./setup.sh --activate${NC}"
echo ""
echo -e "${YELLOW}VS Code Note:${NC}"
echo -e "${GRAY}   VS Code should auto-activate the venv in new terminals.${NC}"
echo -e "${GRAY}   If not, reload the window (Cmd+Shift+P > Reload Window)${NC}"
echo ""
