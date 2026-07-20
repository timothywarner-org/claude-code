"""HTTP launch shim for the DocumentMCP demo server.

The teaching server (mcp_server.py) hardcodes `mcp.run(transport="stdio")` in its
own __main__ block, because the CLI chat app and the `.mcp.json` `oreilly-cca-mcp`
registration both consume it over stdio. This shim leaves that file untouched: it
imports the already-built `mcp` object and runs it on Streamable HTTP instead.

Host and port come from the FASTMCP_HOST / FASTMCP_PORT env vars that the stock
`mcp[cli]` FastMCP reads. Start-Inspector.ps1 sets those before launching this.

Kept as a separate file (not an inline `python -c`) on purpose: passing a
multi-statement `-c` string through PowerShell's Start-Process -ArgumentList
mangles the semicolon and spaces, so the interpreter never gets valid source.
"""

import mcp_server

if __name__ == "__main__":
    mcp_server.mcp.run(transport="streamable-http")
