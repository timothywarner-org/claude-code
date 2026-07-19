import asyncio
import sys
import os
from dotenv import load_dotenv
from contextlib import AsyncExitStack

from mcp import types
from anthropic import Anthropic
from pydantic import FileUrl

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


async def _sampling_handler(_ctx, params: types.CreateMessageRequestParams):
    """MCP sampling: server asked us to run an LLM completion on its behalf."""
    anthropic = Anthropic()
    sys_prompt = params.systemPrompt or ""
    messages = []
    for m in params.messages:
        text = m.content.text if hasattr(m.content, "text") else str(m.content)
        messages.append({"role": m.role, "content": text})

    print(f"\n  🔁  [sampling] server requested LLM completion ({len(messages)} msg)")
    resp = anthropic.messages.create(
        model=claude_model,
        max_tokens=params.maxTokens or 1024,
        system=sys_prompt,
        messages=messages,
        temperature=params.temperature or 1.0,
    )
    text = "\n".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
    return types.CreateMessageResult(
        role="assistant",
        content=types.TextContent(type="text", text=text),
        model=claude_model,
        stopReason="endTurn",
    )


async def _elicitation_handler(_ctx, params: types.ElicitRequestParams):
    """MCP elicitation: server paused execution to ask the human a question."""
    print("\n  ❓  [elicitation] server is asking for your input")
    print(f"      {params.message}")
    props = (params.requestedSchema or {}).get("properties", {})
    answers: dict = {}
    for field_name, spec in props.items():
        desc = spec.get("description", "")
        prompt = f"      • {field_name}"
        if desc:
            prompt += f"  ({desc})"
        raw = input(prompt + ": ").strip()
        if spec.get("type") == "boolean":
            answers[field_name] = raw.lower() in ("true", "y", "yes", "1")
        else:
            answers[field_name] = raw
    return types.ElicitResult(action="accept", content=answers)


async def _list_roots_handler(_ctx) -> types.ListRootsResult:
    """MCP roots: tell the server which locations are in-scope for this session.

    The protocol restricts Root.uri to file:// (see mcp/types.py - `uri: FileUrl`),
    so the in-memory document namespace is exposed as a virtual file:// path
    rather than a custom scheme. The server matches on this sentinel to gate
    edits in `edit_document_safely`.
    """
    return types.ListRootsResult(
        roots=[
            types.Root(
                uri=FileUrl("file:///C:/Users/timot/Desktop/mcp_project"),
                name="MCP Demo Project",
            ),
            types.Root(
                uri=FileUrl("file:///C:/Users/timot/Desktop/mcp_project/docs"),
                name="In-Memory Docs",
            ),
        ]
    )


async def main():
    claude_service = Claude(model=claude_model)

    server_scripts = sys.argv[1:]
    clients = {}

    # MCP_WIRE_TRACE=1 routes stdio through scripts/mcp_wire_trace.py, which
    # logs every JSON-RPC frame to stderr and logs/mcp_wire_trace.log. Use the
    # "MCP: chat (wire-trace server)" launch profile to flip this from VS Code.
    if os.getenv("MCP_WIRE_TRACE", "0") == "1":
        command, args = (sys.executable, ["scripts/mcp_wire_trace.py"])
    elif os.getenv("USE_UV", "0") == "1":
        command, args = ("uv", ["run", "mcp_server.py"])
    else:
        command, args = ("python", ["mcp_server.py"])

    async with AsyncExitStack() as stack:
        doc_client = await stack.enter_async_context(
            MCPClient(
                command=command,
                args=args,
                sampling_callback=_sampling_handler,
                elicitation_callback=_elicitation_handler,
                list_roots_callback=_list_roots_handler,
            )
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


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    asyncio.run(main())
