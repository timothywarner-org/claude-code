import asyncio
import sys
import os
from dotenv import load_dotenv
from contextlib import AsyncExitStack

from mcp_client import MCPClient
from core.claude import Claude

from core.cli_chat import CliChat
from core.cli import CliApp

load_dotenv()

# Anthropic Config
claude_model = os.getenv("CLAUDE_MODEL", "")
anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "")


assert claude_model, "Error: CLAUDE_MODEL cannot be empty. Update .env"
assert anthropic_api_key, (
    "Error: ANTHROPIC_API_KEY cannot be empty. Update .env"
)


async def main():
    claude_service = Claude(model=claude_model)

    server_scripts = sys.argv[1:]
    clients = {}

    command, args = (
        ("uv", ["run", "mcp_server.py"])
        if os.getenv("USE_UV", "0") == "1"
        else ("python", ["mcp_server.py"])
    )

    async with AsyncExitStack() as stack:
        doc_client = await stack.enter_async_context(
            MCPClient(command=command, args=args)
        )
        clients["doc_client"] = doc_client

        for i, server_script in enumerate(server_scripts):
            client_id = f"client_{i}_{server_script}"
            client = await stack.enter_async_context(
                MCPClient(command="uv", args=["run", server_script])
            )
            clients[client_id] = client

        chat = CliChat(
            doc_client=doc_client,
            clients=clients,
            claude_service=claude_service,
        )

        cli = CliApp(chat)
        await cli.initialize()
        await cli.run()


def _silence_proactor_finalizer_noise():
    """Stop Ctrl+C from printing a wall of tracebacks on Windows.

    The tracebacks are emitted from asyncio's __del__ finalizers, NOT from the
    try/except below. On the Windows Proactor loop, Ctrl+C tears the event loop
    down while the MCP stdio subprocess transports are still open. The garbage
    collector then reaps those transports, __del__ tries to build a repr for the
    ResourceWarning, and repr calls .fileno() on a pipe that is already closed:

        ValueError: I/O operation on closed pipe

    Because __del__ runs during interpreter shutdown, after asyncio.run() has
    already returned, no except clause can reach it. The exception is swallowed
    ("Exception ignored in: ...") and the process still exits 0 - the shutdown is
    already clean and the noise is pure cosmetics. But a cohort watching a demo
    reads a red traceback as a crash, so route these finalizer-time exceptions to
    a no-op instead of stderr.

    Deliberately narrow: it only suppresses unraisable exceptions raised from a
    __del__ during teardown. A real exception on a live code path still prints.
    """
    if sys.platform != "win32":
        return

    def _ignore_unraisable(unraisable):
        exc = unraisable.exc_value
        if isinstance(exc, ValueError) and "closed pipe" in str(exc):
            return
        sys.__unraisablehook__(unraisable)

    sys.unraisablehook = _ignore_unraisable


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    _silence_proactor_finalizer_noise()
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        # A second Ctrl+C can interrupt MCP stdio subprocess cleanup on Windows.
        # Treat that as an operator-requested shutdown, not a crash report.
        print("\nInterrupted. MCP CLI stopped.")
