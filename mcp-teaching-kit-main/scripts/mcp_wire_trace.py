"""JSON-RPC wire tracer for the MCP stdio transport.

Run this in place of `mcp_server.py`. It spawns the real server as a child,
sits between the parent (the chat client) and the child (the server), and
logs every JSON-RPC frame in both directions to stderr and to a log file.

This is the teaching microscope. When a learner asks "what actually goes
over the wire when I call /format, or when the server triggers sampling,
or when elicitation pauses for input?" - this is what they look at.

Windows note: we use **threaded blocking I/O** for our own stdin/stdout
rather than asyncio stream wrappers. Wrapping the parent process's stdio
as asyncio streams on the Windows ProactorEventLoop fails with WinError 6
because Python opens those handles in a mode IOCP cannot register. The
child server's pipes (returned by create_subprocess_exec) are real OS
pipes and work fine with asyncio - so we keep those on the event loop.

Usage:
    # Through the chat client (the normal path - use the VS Code launch
    # profile "MCP: chat (wire-trace server)" or set MCP_WIRE_TRACE=1):
    MCP_WIRE_TRACE=1 python main.py

Log location:
    logs/mcp_wire_trace.log  (rotated per run; previous run moved to .prev.log)
"""

from __future__ import annotations

import asyncio
import datetime as dt
import json
import os
import sys
import threading
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SERVER_SCRIPT = REPO_ROOT / "mcp_server.py"
LOG_DIR = REPO_ROOT / "logs"
LOG_PATH = LOG_DIR / "mcp_wire_trace.log"


def _ts() -> str:
    return dt.datetime.now().strftime("%H:%M:%S.%f")[:-3]


def _open_log():
    LOG_DIR.mkdir(exist_ok=True)
    if LOG_PATH.exists():
        prev = LOG_PATH.with_suffix(".prev.log")
        if prev.exists():
            prev.unlink()
        LOG_PATH.rename(prev)
    return LOG_PATH.open("w", encoding="utf-8", buffering=1)


def _pretty(direction: str, raw: bytes, log) -> None:
    text = raw.decode("utf-8", errors="replace").rstrip("\n")
    if not text:
        return
    try:
        obj = json.loads(text)
        kind = (
            obj.get("method")
            or ("response" if "result" in obj or "error" in obj else "?")
        )
        rpc_id = obj.get("id", "-")
        header = f"[{_ts()}] {direction} id={rpc_id} {kind}"
        body = json.dumps(obj, indent=2, ensure_ascii=False)
    except json.JSONDecodeError:
        header = f"[{_ts()}] {direction} (non-JSON frame)"
        body = text

    line = f"\n{header}\n{body}\n"
    sys.stderr.write(line)
    sys.stderr.flush()
    log.write(line)


def _stdin_pump_thread(queue: "asyncio.Queue[bytes | None]", loop: asyncio.AbstractEventLoop, log) -> None:
    """Blocking-read our own stdin in a thread, push frames onto the event loop."""
    fh = sys.stdin.buffer
    while True:
        line = fh.readline()
        if not line:
            asyncio.run_coroutine_threadsafe(queue.put(None), loop)
            break
        _pretty("C->S", line, log)
        asyncio.run_coroutine_threadsafe(queue.put(line), loop)


async def _forward_to_child(queue: "asyncio.Queue[bytes | None]", child_stdin: asyncio.StreamWriter) -> None:
    """Drain the queue on the event loop and write to the child's stdin StreamWriter."""
    while True:
        line = await queue.get()
        if line is None:
            break
        try:
            child_stdin.write(line)
            await child_stdin.drain()
        except (BrokenPipeError, ConnectionResetError):
            break
    try:
        child_stdin.close()
    except Exception:
        pass


async def _child_to_stdout(child_stdout: asyncio.StreamReader, log) -> None:
    """Read the child server's stdout on the event loop and forward to our own."""
    out = sys.stdout.buffer
    while True:
        line = await child_stdout.readline()
        if not line:
            break
        _pretty("S->C", line, log)
        out.write(line)
        out.flush()


async def main() -> int:
    log = _open_log()
    sys.stderr.write(
        f"[mcp_wire_trace] logging to {LOG_PATH} (mirrored to stderr)\n"
    )
    sys.stderr.flush()

    proc = await asyncio.create_subprocess_exec(
        sys.executable,
        str(SERVER_SCRIPT),
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=sys.stderr,
        env={**os.environ, "PYTHONUNBUFFERED": "1"},
    )

    assert proc.stdin is not None and proc.stdout is not None

    # Bridge: blocking stdin reader (thread) -> asyncio.Queue -> child stdin (event loop).
    # This sidesteps the Windows ProactorEventLoop limitation where parent
    # stdio cannot be wrapped as an asyncio stream (WinError 6 on IOCP register).
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[bytes | None] = asyncio.Queue()
    pump_in = threading.Thread(
        target=_stdin_pump_thread,
        args=(queue, loop, log),
        daemon=True,
        name="stdin->child",
    )
    pump_in.start()

    try:
        await asyncio.gather(
            _forward_to_child(queue, proc.stdin),
            _child_to_stdout(proc.stdout, log),
        )
    finally:
        rc = await proc.wait()
        log.close()
    return rc


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    sys.exit(asyncio.run(main()))
