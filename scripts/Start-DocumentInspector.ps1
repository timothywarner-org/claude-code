#Requires -Version 7.0
<#
.SYNOPSIS
    Bulletproof, idempotent launcher for the DocumentMCP server + standalone MCP
    Inspector. Force-frees all demo ports first, then starts both pieces clean.

.DESCRIPTION
    Brings the whole demo up with one command, from any prior state (fresh boot,
    half-dead Inspector, orphaned server). Two independent pieces:

      1. DocumentMCP server - the FastMCP server in mcp-example/mcp_cli/mcp_server.py,
         driven over Streamable HTTP on port 6290 (path /mcp). That server ships with
         `mcp.run(transport="stdio")` hardcoded in __main__ (Claude Code consumes it
         over stdio via the `.mcp.json` `DocumentMCP-ClaudeCode` registration), so we
         do NOT touch the file. Instead the sibling shim `_http_launch.py` imports its
         `mcp` object and calls `.run(transport="streamable-http")`, with host/port
         set via FASTMCP_HOST / FASTMCP_PORT. The teaching server file stays
         byte-for-byte as the course expects. (The shim is a real file, not an inline
         `python -c`, because PowerShell's Start-Process mangles a multi-statement -c
         string - the semicolon gets eaten and Python chokes.)
      2. MCP Inspector 1.0.0 - the standalone `@modelcontextprotocol/inspector`
         browser UI on port 6284 (proxy 6287). You connect it to the server via
         Transport = Streamable HTTP, URL = http://127.0.0.1:6290/mcp.

    Why the inline-import HTTP launch and NOT `mcp dev mcp_server.py`: the stock
    `mcp[cli]` dev wrapper reloads by default and adds a spawn layer that muddies
    a clean class demo. Running the server directly on HTTP, then pointing the
    standalone Inspector at it, is the same reliable two-piece pattern the memory
    server's Start-MemoryInspector.ps1 uses.

    This script lives in scripts/ but drives a server in mcp-example/mcp_cli/. It
    resolves that folder relative to its own location, so it runs from any cwd.

    Ports differ from the memory server's launcher (6280/6274/6277) on purpose:
    6290/6284/6287 here, so BOTH demos can run side by side with no collision.

.PARAMETER ServerPort
    HTTP port for the DocumentMCP server. Default 6290.

.PARAMETER UiPort
    Inspector UI port. Default 6284.

.PARAMETER ProxyPort
    Inspector proxy port. Default 6287.

.PARAMETER NoAuth
    Disable the Inspector session token for a frictionless local class demo.
    Local-only (127.0.0.1); never use on a shared or exposed host.

.EXAMPLE
    ./scripts/Start-DocumentInspector.ps1 -NoAuth
    Force-frees ports, starts the server, opens the Inspector on
    http://localhost:6284. Then in the UI: Streamable HTTP ->
    http://127.0.0.1:6290/mcp -> Connect.

.NOTES
    Author: Tim Warner. Teaching artifact for the MCP course materials.
    POST-REBOOT: this one command is all you need to restore the demo.
#>
[CmdletBinding()]
param(
    [int]$ServerPort = 6290,
    [int]$UiPort = 6284,
    [int]$ProxyPort = 6287,
    [switch]$NoAuth
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# This launcher lives in scripts/, but the server it drives lives two folders over
# in mcp-example/mcp_cli/. Resolve that server folder relative to THIS script so
# the launcher works from any cwd. Resolve-Path fails loud if the layout moved.
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ServerDir = Join-Path $RepoRoot 'mcp-example\mcp_cli'
$VenvPython = Join-Path $ServerDir '.venv\Scripts\python.exe'
$ServerScript = Join-Path $ServerDir 'mcp_server.py'
$LaunchShim = Join-Path $ServerDir '_http_launch.py'
$McpUrl = "http://127.0.0.1:$ServerPort/mcp"

function Write-Step { param([string]$Message) Write-Host "==> $Message" -ForegroundColor Cyan }

# --- Pre-flight validation: fail loud and early, never half-start ---------------
if (-not (Test-Path $ServerDir)) {
    throw "Server folder not found at $ServerDir. Expected mcp-example/mcp_cli/ two levels from this script."
}
if (-not (Test-Path $VenvPython)) {
    throw "Venv Python not found at $VenvPython. Run 'uv sync --project `"$ServerDir`"' first."
}
if (-not (Test-Path $ServerScript)) {
    throw "mcp_server.py not found at $ServerScript."
}
if (-not (Test-Path $LaunchShim)) {
    throw "_http_launch.py shim not found at $LaunchShim (it ships next to mcp_server.py)."
}

# --- Step 1: force-free every demo port (the idempotency guarantee) --------------
# Get-NetTCPConnection maps a port to its owning PID; we stop every owner so a
# stale server or Inspector can never block a restart.
function Clear-Port {
    param([int]$Port)
    $owners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    if (-not $owners) {
        Write-Host "    port $Port already free" -ForegroundColor DarkGray
        return
    }
    foreach ($processId in $owners) {
        try {
            $proc = Get-Process -Id $processId -ErrorAction Stop
            Write-Host "    freeing port $Port : stopping $($proc.ProcessName) (PID $processId)" -ForegroundColor Yellow
            Stop-Process -Id $processId -Force -ErrorAction Stop
        }
        catch {
            Write-Host "    PID $processId on port $Port already gone" -ForegroundColor DarkGray
        }
    }
}

Write-Step "Force-freeing ports $ServerPort (server), $UiPort (UI), $ProxyPort (proxy)"
Clear-Port -Port $ServerPort
Clear-Port -Port $UiPort
Clear-Port -Port $ProxyPort

# Brief settle so the OS actually releases the sockets before we rebind.
Start-Sleep -Milliseconds 400

# --- Step 2: reap orphaned children from closed terminals ------------------------
# A closed Windows Terminal tab can leave detached children:
#   - python running THIS server (matched on the mcp_server import + this dir)
#   - node running the Inspector package
# Match on command-line signatures scoped to this server so we never touch
# unrelated node/python apps. Reaping both keeps restarts from piling up.
Write-Step "Reaping orphaned server + Inspector children"
$dirPattern = [regex]::Escape($ServerDir)
$reaped = 0
$orphans = @()
$orphans += Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and ($_.CommandLine -match 'mcp_server|_http_launch') -and ($_.CommandLine -match $dirPattern) }
$orphans += Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match 'modelcontextprotocol[\\/]inspector' }
foreach ($orphan in $orphans) {
    try { Stop-Process -Id $orphan.ProcessId -Force -ErrorAction Stop; $reaped++ } catch { }
}
Write-Host "    reaped $reaped orphaned process(es)" -ForegroundColor DarkGray

# --- Step 3: start the DocumentMCP server (HTTP) ---------------------------------
# The server file hardcodes stdio in __main__, so the `_http_launch.py` shim
# imports its `mcp` object and runs it on Streamable HTTP instead. Host/port come
# from env vars the stock `mcp[cli]` FastMCP reads (FASTMCP_HOST / FASTMCP_PORT).
# Launched detached so this script can go on to run the Inspector in the
# foreground. A real shim file (not `python -c`) because Start-Process mangles a
# multi-statement -c string.
Write-Step "Starting DocumentMCP server on $McpUrl (Streamable HTTP)"
$env:FASTMCP_HOST = '127.0.0.1'
$env:FASTMCP_PORT = "$ServerPort"
$serverProc = Start-Process -FilePath $VenvPython -ArgumentList @($LaunchShim) `
    -WorkingDirectory $ServerDir -PassThru -WindowStyle Hidden
Write-Host "    server launcher PID $($serverProc.Id)" -ForegroundColor DarkGray

# Poll until the MCP endpoint answers, so we never open the Inspector against a
# server that has not finished binding.
Write-Step "Waiting for server to accept connections"
$ready = $false
foreach ($i in 1..30) {
    Start-Sleep -Milliseconds 500
    try {
        # A GET to /mcp returns a 307 -> /mcp/ (then a 4xx without stream headers),
        # which still proves the socket is bound and serving. Any HTTP response =
        # ready. -SkipHttpErrorCheck keeps a 4xx from throwing; do NOT add
        # -MaximumRedirection 0 here - it makes the 307 itself throw and the poll
        # false-negatives forever.
        Invoke-WebRequest -Uri $McpUrl -Method Get -TimeoutSec 2 -SkipHttpErrorCheck | Out-Null
        $ready = $true
        break
    }
    catch { }
}
if (-not $ready) {
    throw "Server did not come up on $McpUrl within 15s. Check the server window / logs."
}
Write-Host "    server is serving MCP at $McpUrl" -ForegroundColor Green

# --- Step 4: launch the standalone Inspector (foreground) ------------------------
Write-Step "Launching MCP Inspector UI on http://localhost:$UiPort"
if ($NoAuth) {
    $env:DANGEROUSLY_OMIT_AUTH = 'true'
    Write-Host "    auth disabled (local class mode)" -ForegroundColor Green
}
else {
    Remove-Item Env:\DANGEROUSLY_OMIT_AUTH -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "  In the Inspector browser tab, connect with:" -ForegroundColor White
Write-Host "    Transport Type : Streamable HTTP" -ForegroundColor White
Write-Host "    URL            : $McpUrl" -ForegroundColor White
Write-Host "    then click Connect." -ForegroundColor White
Write-Host ""

$env:CLIENT_PORT = "$UiPort"
$env:SERVER_PORT = "$ProxyPort"

# Foreground: this terminal IS the Inspector session. Ctrl+C stops the Inspector;
# re-run this script to restart everything clean. The detached server keeps
# running; Step 1 of the next run reaps it, so there is no leak across restarts.
& npx "@modelcontextprotocol/inspector@1.0.0"
