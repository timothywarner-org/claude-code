# setup.ps1 - Virtual Environment Setup Script for Copilot Tips MCP Server
# Primary bootstrap script for Windows users (PowerShell 7+ / pwsh)
#
# Usage:
#   pwsh .\setup.ps1           - Create venv and install dependencies
#   pwsh .\setup.ps1 -Force    - Recreate venv from scratch
#   pwsh .\setup.ps1 -Activate - Only activate existing venv

param(
    [switch]$Force,
    [switch]$Activate
)

$ErrorActionPreference = "Stop"

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$VenvDir = Join-Path $ScriptDir ".venv"
$VenvActivate = Join-Path $VenvDir "Scripts\Activate.ps1"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Memory MCP Server - Environment Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if just activating
if ($Activate) {
    if (Test-Path $VenvActivate) {
        Write-Host "Activating virtual environment..." -ForegroundColor Green
        & $VenvActivate
        Write-Host ""
        Write-Host "Virtual environment activated!" -ForegroundColor Green
        Write-Host "Python: $VenvPython" -ForegroundColor Gray
        exit 0
    } else {
        Write-Host "ERROR: Virtual environment not found at $VenvDir" -ForegroundColor Red
        Write-Host "Run .\setup.ps1 without -Activate to create it first." -ForegroundColor Yellow
        exit 1
    }
}

# Check Python is available
Write-Host "Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "   Found: $pythonVersion" -ForegroundColor Gray
} catch {
    Write-Host "ERROR: Python not found in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.10+ from https://python.org" -ForegroundColor Yellow
    exit 1
}

# Remove existing venv if Force flag is set
if ($Force -and (Test-Path $VenvDir)) {
    Write-Host "Removing existing virtual environment..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $VenvDir
    Write-Host "   Done" -ForegroundColor Gray
}

# Create virtual environment if it doesn't exist
if (-not (Test-Path $VenvDir)) {
    Write-Host ""
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv $VenvDir
    Write-Host "   Created at: $VenvDir" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Virtual environment already exists" -ForegroundColor Green
    Write-Host "   Location: $VenvDir" -ForegroundColor Gray
    Write-Host "   Use -Force to recreate it" -ForegroundColor Gray
}

# Activate and install dependencies
Write-Host ""
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& $VenvActivate

Write-Host ""
Write-Host "Upgrading pip..." -ForegroundColor Yellow
& $VenvPython -m pip install --upgrade pip --quiet

Write-Host ""
Write-Host "Installing dependencies from pyproject.toml..." -ForegroundColor Yellow
& $VenvPython -m pip install -e ".[dev]" --quiet
Write-Host "   Done" -ForegroundColor Gray

# Verify installation
Write-Host ""
Write-Host "Verifying installation..." -ForegroundColor Yellow
try {
    $fastmcpVersion = & $VenvPython -c "import fastmcp; print(fastmcp.__version__)" 2>&1
    Write-Host "   fastmcp: $fastmcpVersion" -ForegroundColor Gray
} catch {
    Write-Host "   fastmcp: installed (version check failed)" -ForegroundColor Gray
}

try {
    $mcpVersion = & $VenvPython -c "import mcp; print(mcp.__version__)" 2>&1
    Write-Host "   mcp: $mcpVersion" -ForegroundColor Gray
} catch {
    Write-Host "   mcp: installed (version check failed)" -ForegroundColor Gray
}

# Success message
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "The virtual environment is now activated in this terminal." -ForegroundColor Cyan
Write-Host ""
Write-Host "Quick Commands:" -ForegroundColor Yellow
Write-Host "   Run the server:      python copilot_tips_server.py" -ForegroundColor Gray
Write-Host "   Start inspector:     python start_inspector.py" -ForegroundColor Gray
Write-Host "   Activate later:      pwsh .\setup.ps1 -Activate" -ForegroundColor Gray
Write-Host ""
Write-Host "VS Code Note:" -ForegroundColor Yellow
Write-Host "   VS Code should auto-activate the venv in new terminals." -ForegroundColor Gray
Write-Host "   If not, reload the window (Ctrl+Shift+P > Reload Window)" -ForegroundColor Gray
Write-Host ""
