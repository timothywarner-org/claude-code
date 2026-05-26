from typing import List, Optional
from prompt_toolkit import PromptSession
from prompt_toolkit.completion import Completer, Completion
from prompt_toolkit.formatted_text import FormattedText
from prompt_toolkit.key_binding import KeyBindings
from prompt_toolkit.history import InMemoryHistory
from prompt_toolkit.auto_suggest import AutoSuggest, Suggestion
from prompt_toolkit.document import Document
from prompt_toolkit.buffer import Buffer

from core.cli_chat import CliChat


META_COMMANDS = [
    (":help", "Show this menu"),
    (":docs", "List documents exposed by the MCP server"),
    (":prompts", "List slash-prompts exposed by the MCP server"),
    (":tools", "List tools across every connected MCP server"),
    (":clear", "Clear the screen"),
    (":reset", "Clear chat history (start a fresh conversation)"),
    (":quit", "Exit the chat (Ctrl+C also works)"),
]


class CommandAutoSuggest(AutoSuggest):
    def __init__(self, prompts: List):
        self.prompts = prompts
        self.prompt_dict = {prompt.name: prompt for prompt in prompts}

    def get_suggestion(
        self, buffer: Buffer, document: Document
    ) -> Optional[Suggestion]:
        text = document.text

        if not text.startswith("/"):
            return None

        parts = text[1:].split()

        if len(parts) == 1:
            cmd = parts[0]

            if cmd in self.prompt_dict:
                prompt = self.prompt_dict[cmd]
                return Suggestion(f" {prompt.arguments[0].name}")

        return None


class UnifiedCompleter(Completer):
    def __init__(self):
        self.prompts = []
        self.prompt_dict = {}
        self.resources = []

    def update_prompts(self, prompts: List):
        self.prompts = prompts
        self.prompt_dict = {prompt.name: prompt for prompt in prompts}

    def update_resources(self, resources: List):
        self.resources = resources

    def get_completions(self, document, complete_event):
        text = document.text
        text_before_cursor = document.text_before_cursor

        if "@" in text_before_cursor:
            last_at_pos = text_before_cursor.rfind("@")
            prefix = text_before_cursor[last_at_pos + 1 :]

            for resource_id in self.resources:
                if resource_id.lower().startswith(prefix.lower()):
                    yield Completion(
                        resource_id,
                        start_position=-len(prefix),
                        display=resource_id,
                        display_meta="Resource",
                    )
            return

        if text.startswith("/"):
            parts = text[1:].split()

            if len(parts) <= 1 and not text.endswith(" "):
                cmd_prefix = parts[0] if parts else ""

                for prompt in self.prompts:
                    if prompt.name.startswith(cmd_prefix):
                        yield Completion(
                            prompt.name,
                            start_position=-len(cmd_prefix),
                            display=f"/{prompt.name}",
                            display_meta=prompt.description or "",
                        )
                return

            if len(parts) == 1 and text.endswith(" "):
                cmd = parts[0]

                if cmd in self.prompt_dict:
                    for id in self.resources:
                        yield Completion(
                            id,
                            start_position=0,
                            display=id,
                        )
                return

            if len(parts) >= 2:
                doc_prefix = parts[-1]

                for resource_id in self.resources:
                    if resource_id.lower().startswith(doc_prefix.lower()):
                        yield Completion(
                            resource_id,
                            start_position=-len(doc_prefix),
                            display=resource_id,
                        )
                return


class CliApp:
    def __init__(self, agent: CliChat):
        self.agent = agent
        self.resources = []
        self.prompts = []

        self.completer = UnifiedCompleter()

        self.command_autosuggester = CommandAutoSuggest([])

        self.kb = KeyBindings()

        @self.kb.add("/")
        def _(event):
            buffer = event.app.current_buffer
            if buffer.document.is_cursor_at_the_end and not buffer.text:
                buffer.insert_text("/")
                buffer.start_completion(select_first=False)
            else:
                buffer.insert_text("/")

        @self.kb.add("@")
        def _(event):
            buffer = event.app.current_buffer
            buffer.insert_text("@")
            if buffer.document.is_cursor_at_the_end:
                buffer.start_completion(select_first=False)

        @self.kb.add(" ")
        def _(event):
            buffer = event.app.current_buffer
            text = buffer.text

            buffer.insert_text(" ")

            if text.startswith("/"):
                parts = text[1:].split()

                if len(parts) == 1:
                    buffer.start_completion(select_first=False)
                elif len(parts) == 2:
                    arg = parts[1]
                    if (
                        "doc" in arg.lower()
                        or "file" in arg.lower()
                        or "id" in arg.lower()
                    ):
                        buffer.start_completion(select_first=False)

        self.history = InMemoryHistory()
        self.session = PromptSession(
            completer=self.completer,
            history=self.history,
            key_bindings=self.kb,
            complete_while_typing=True,
            complete_in_thread=True,
            auto_suggest=self.command_autosuggester,
        )

    async def initialize(self):
        await self.refresh_resources()
        await self.refresh_prompts()
        self._print_banner()
        self._print_status()
        self._print_help()

    async def refresh_resources(self):
        try:
            self.resources = await self.agent.list_docs_ids()
            self.completer.update_resources(self.resources)
        except Exception as e:
            print(f"Error refreshing resources: {e}")

    async def refresh_prompts(self):
        try:
            self.prompts = await self.agent.list_prompts()
            self.completer.update_prompts(self.prompts)
            self.command_autosuggester = CommandAutoSuggest(self.prompts)
            self.session.auto_suggest = self.command_autosuggester
        except Exception as e:
            print(f"Error refreshing prompts: {e}")

    def _print_banner(self):
        print("\nMCP Chat")
        print("Talk to Claude with MCP docs, prompts, and tools.")

    def _print_status(self):
        model = getattr(self.agent.claude_service, "model", "?")
        n_docs = len(self.resources)
        n_prompts = len(self.prompts)
        n_clients = len(self.agent.clients)
        print(
            f"Status: model={model} | servers={n_clients} | "
            f"docs={n_docs} | prompts={n_prompts}"
        )

    def _print_help(self):
        print("\nMenu")
        for cmd, desc in META_COMMANDS:
            print(f"  {cmd:<10} {desc}")
        print("\nShortcuts: @doc for resources, /prompt for server prompts, Tab completes.\n")

    def _print_docs(self):
        if not self.resources:
            print("No documents available from the MCP server.\n")
            return
        print("\nDocuments")
        for index, doc_id in enumerate(self.resources, start=1):
            print(f"  {index}. @{doc_id}")
        print()

    def _print_prompts(self):
        if not self.prompts:
            print("No prompts registered on the MCP server.\n")
            return
        print("\nPrompts")
        for p in self.prompts:
            desc = (p.description or "").strip().splitlines()[0] if p.description else ""
            suffix = f" - {desc}" if desc else ""
            print(f"  /{p.name}{suffix}")
        print()

    async def _print_tools(self):
        from core.tools import ToolManager
        tools = await ToolManager.get_all_tools(self.agent.clients)
        if not tools:
            print("No tools registered on any connected MCP server.\n")
            return
        print("\nTools")
        for t in tools:
            desc = (t.get("description") or "").strip().splitlines()[0]
            suffix = f" - {desc}" if desc else ""
            print(f"  {t['name']}{suffix}")
        print()

    def _print_response(self, response: str):
        print("\nClaude")
        print("------")
        for line in (response or "").splitlines() or [""]:
            print(line)
        print()

    async def _handle_meta(self, cmd: str) -> bool:
        head = cmd.strip().lower()
        if head in (":q", ":quit", ":exit"):
            print("\nBye.\n")
            raise EOFError
        if head in (":h", ":help", ":?"):
            self._print_help()
            return True
        if head == ":clear":
            print("\033[2J\033[H", end="")
            self._print_banner()
            self._print_status()
            return True
        if head == ":reset":
            self.agent.messages.clear()
            print("Conversation history cleared.\n")
            return True
        if head == ":docs":
            await self.refresh_resources()
            self._print_docs()
            return True
        if head == ":prompts":
            await self.refresh_prompts()
            self._print_prompts()
            return True
        if head == ":tools":
            await self._print_tools()
            return True
        return False

    def _prompt_fragments(self):
        return FormattedText(
            [
                ("", "you> "),
            ]
        )

    async def run(self):
        while True:
            try:
                user_input = await self.session.prompt_async(self._prompt_fragments())
                if not user_input.strip():
                    continue

                if user_input.strip().startswith(":"):
                    if await self._handle_meta(user_input):
                        continue
                    print(f"Unknown meta-command: {user_input.strip()} (try :help)\n")
                    continue

                print("Thinking...")
                response = await self.agent.run(user_input)
                self._print_response(response)

            except (KeyboardInterrupt, EOFError):
                break
