#!/usr/bin/env python3
"""
MCP Inspector Launcher

Launches the MCP Inspector web UI with a random port to avoid conflicts.
Automatically starts the Memory MCP server for inspection.

Usage:
    python start_inspector.py

Requirements:
    - Node.js 18+ and npx must be installed
    - The virtual environment should be activated (auto-detects if not)
"""

import os
import random
import shutil
import socket
import subprocess
import sys
from pathlib import Path


def check_node_installed() -> tuple[bool, str]:
    """Check if Node.js and npx are available. Returns (success, version_or_error)."""
    npx_path = shutil.which("npx")
    if npx_path is None:
        # On Windows, also check for npx.cmd
        if sys.platform == "win32":
            npx_path = shutil.which("npx.cmd")
        if npx_path is None:
            return False, "npx not found in PATH"

    # Verify it actually works
    try:
        result = subprocess.run(
            ["npx", "--version"],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
            shell=True  # Required on Windows to find npx.cmd
        )
        if result.returncode == 0:
            version = result.stdout.strip()
            return True, version
        return False, f"npx returned error: {result.stderr.strip()}"
    except subprocess.TimeoutExpired:
        return False, "npx version check timed out"
    except FileNotFoundError:
        return False, "npx executable not found"
    except Exception as e:
        return False, f"Unexpected error: {e}"


def get_random_port() -> int:
    """Generate a random available port in the dynamic/private range."""
    # Use dynamic/private port range: 49152-65535
    max_attempts = 10
    for _ in range(max_attempts):
        port = random.randint(49152, 65535)
        if is_port_available(port):
            return port
    # Fallback: let OS assign a port (return 0 signals auto-assign)
    return random.randint(49152, 65535)


def is_port_available(port: int) -> bool:
    """Check if a port is available for binding."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            s.bind(("127.0.0.1", port))
            return True
    except (OSError, socket.error):
        return False


def get_python_executable() -> str:
    """Get the path to the Python executable in the virtual environment."""
    # Check if we're in a venv
    if sys.prefix != sys.base_prefix:
        return sys.executable

    # Try to find venv Python
    src_dir = Path(__file__).parent
    venv_dir = src_dir / ".venv"

    if sys.platform == "win32":
        venv_python = venv_dir / "Scripts" / "python.exe"
    else:
        venv_python = venv_dir / "bin" / "python"

    if venv_python.exists():
        return str(venv_python)

    # Fall back to current Python
    return sys.executable


def main():
    """Launch MCP Inspector with the Memory server."""
    print("=" * 60)
    print("  MCP Inspector Launcher - Memory Server")
    print("=" * 60)
    print()

    # Check for Node.js
    print("🔍 Checking for Node.js and npx...")
    node_ok, node_info = check_node_installed()
    if not node_ok:
        print()
        print("❌ ERROR: Node.js/npx not found!")
        print(f"   Details: {node_info}")
        print()
        print("The MCP Inspector requires Node.js 18+ to run.")
        print("Please install Node.js from: https://nodejs.org/")
        print()
        print("After installing, restart your terminal and try again.")
        sys.exit(1)

    print(f"   ✅ npx version: {node_info}")
    print()

    # Generate random port
    port = get_random_port()
    print(f"🎲 Using port: {port} (verified available)")
    print()

    # Get paths
    src_dir = Path(__file__).parent.resolve()
    server_script = src_dir / "memory_server.py"
    python_exe = get_python_executable()

    # Verify server script exists
    if not server_script.exists():
        print(f"❌ ERROR: Server script not found: {server_script}")
        sys.exit(1)

    # Verify Python executable exists
    if not Path(python_exe).exists():
        print(f"❌ ERROR: Python executable not found: {python_exe}")
        print("   Run setup.ps1 or setup.sh to create the virtual environment.")
        sys.exit(1)

    # Convert to strings with forward slashes (works on Windows and avoids escaping issues)
    server_script_str = str(server_script).replace("\\", "/")
    python_exe_str = str(python_exe).replace("\\", "/")

    print(f"📁 Server script: {server_script_str}")
    print(f"🐍 Python executable: {python_exe_str}")
    print()

    # Build the inspector command as a string for shell execution
    inspector_cmd = f'npx @modelcontextprotocol/inspector@latest -- "{python_exe_str}" "{server_script_str}"'

    # Set environment variables
    env = os.environ.copy()
    env["MCP_INSPECTOR_PORT"] = str(port)

    print("🚀 Starting MCP Inspector...")
    print()
    print(f"   Web UI will be available at: http://localhost:{port}")
    print()
    print("   Press Ctrl+C to stop the inspector")
    print()
    print("-" * 60)
    print()

    try:
        # Run the inspector (shell=True required on Windows to find npx.cmd)
        process = subprocess.run(
            inspector_cmd,
            env=env,
            cwd=str(src_dir),
            check=False,
            shell=True
        )
        if process.returncode != 0 and process.returncode != 130:
            # 130 = SIGINT (Ctrl+C), which is normal
            print()
            print(f"⚠️  Inspector exited with code: {process.returncode}")
    except KeyboardInterrupt:
        print()
        print()
        print("👋 Inspector stopped by user (Ctrl+C).")
    except FileNotFoundError as e:
        print(f"❌ ERROR: Failed to start MCP Inspector: {e}")
        print("   Try running: npx @modelcontextprotocol/inspector@latest --help")
        sys.exit(1)
    except Exception as e:
        print(f"❌ ERROR: Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
