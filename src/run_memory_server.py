#!/usr/bin/env python3
"""
Auto-activate venv launcher for memory_server.py

This script ensures the virtual environment is activated before running
the memory server, making it easier to run from anywhere.
"""
import os
import sys
from pathlib import Path

# Get the directory containing this script
SCRIPT_DIR = Path(__file__).parent.resolve()
VENV_DIR = SCRIPT_DIR / ".venv"

# Determine the Python executable in the venv
if sys.platform == "win32":
    VENV_PYTHON = VENV_DIR / "Scripts" / "python.exe"
else:
    VENV_PYTHON = VENV_DIR / "bin" / "python"

# If we're not running with the venv Python, restart with it
if not VENV_PYTHON.exists():
    print(f"ERROR: Virtual environment not found at {VENV_DIR}", file=sys.stderr)
    print("Run setup.ps1 or setup.sh to create it first.", file=sys.stderr)
    sys.exit(1)

# Check if we're already running with the venv Python
current_python = Path(sys.executable).resolve()
venv_python_resolved = VENV_PYTHON.resolve()

if current_python != venv_python_resolved:
    # Restart with the venv Python
    import subprocess
    result = subprocess.run(
        [str(VENV_PYTHON), str(Path(__file__).parent / "memory_server.py")] + sys.argv[1:],
        env=os.environ
    )
    sys.exit(result.returncode)

# If we get here, we're running with the correct venv Python
# Import and run the actual server
if __name__ == "__main__":
    from memory_server import main
    main()
