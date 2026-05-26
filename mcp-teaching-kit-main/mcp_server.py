from mcp.server.fastmcp import FastMCP, Context
from pydantic import BaseModel

mcp = FastMCP("DocumentMCP", log_level="ERROR")

# Sentinel URI substring that identifies the in-memory document namespace as
# a declared client root. The protocol forces file:// scheme on Root.uri, so
# we publish the virtual docs path as a file URL and match on the tail here.
DOCS_ROOT_MARKER = "/docs"

# Soft-delete bin. Documents removed via delete_document with hard_delete=False
# land here. This lets the demo show recoverable vs irrecoverable destructive
# ops side-by-side, mirroring how production systems (S3 versioning, GitHub
# repo archive, Gmail trash) actually handle "delete".
_trash: dict[str, str] = {}


docs = {
    "mcp-overview.md": (
        "Model Context Protocol, or MCP, is an open standard from Anthropic that lets large language model "
        "applications talk to external tools, data, and prompts through a single uniform interface. Before MCP, "
        "every chat client glued itself to every backend with bespoke function-calling glue. After MCP, the client "
        "speaks one wire protocol and any compliant server plugs in. "
        "MCP defines four primitives. First, tools are model-invoked functions the server exposes, such as "
        "read_doc_contents or edit_document. Second, resources are read-only data the client can fetch by URI, "
        "typically used to seed context without an LLM round trip. Third, prompts are reusable user-message "
        "templates the client surfaces as slash commands. Fourth, sampling lets the server delegate generation back "
        "to the client's own model, which is how a server can summarize a document without shipping its own LLM. "
        "Two newer primitives round out the picture. Roots let the client declare which filesystem or namespace the "
        "server is allowed to touch this session, and elicitation lets the server pause mid-tool-call to ask the "
        "human for confirmation. Transports cover stdio for local subprocesses and streamable HTTP for remote "
        "servers. The win for an Azure shop is that the same server runs unchanged behind Claude Desktop, VS Code, "
        "or a custom agent host built on the Azure AI Foundry Agent Service."
    ),
    "azure-ai-foundry.pdf": (
        "Azure AI Foundry is Microsoft's unified platform for building, evaluating, and operating production AI "
        "agents on Azure. It replaces the older split between Azure OpenAI Studio and Azure AI Studio with a single "
        "portal, SDK, and control plane. The core unit of work is a project, which scopes models, connections, "
        "datasets, evaluations, and deployed agents under one Azure resource. "
        "The Foundry Agent Service is the runtime that hosts agents. An agent is defined by three things: a model "
        "deployment such as gpt-4.1 or a fine-tuned variant, a set of instructions, and a tool inventory. Tools can "
        "be built-in, such as File Search over an attached vector store, Code Interpreter in a sandboxed Python "
        "container, and Bing Grounding for fresh web results. Tools can also be custom, exposed through OpenAPI, "
        "Azure Functions, Logic Apps, or an MCP server connection. "
        "Foundry handles three operational concerns out of the box. Identity flows through Entra ID with managed "
        "identities, so agents never hold static keys. Observability is wired to Application Insights with trace "
        "spans per tool call. Evaluation is first class, with built-in metrics for groundedness, relevance, and "
        "safety, plus support for custom evaluators run on a schedule against a golden dataset."
    ),
    "copilot-studio-faq.docx": (
        "Microsoft Copilot Studio is the low-code authoring environment for building custom copilots and autonomous "
        "agents that run inside Microsoft 365, Teams, and standalone web channels. It targets business users and "
        "fusion teams, not pro-code Python developers, though everything it produces is callable from pro-code "
        "surfaces. "
        "The most common question is how Copilot Studio differs from Azure AI Foundry. The short answer: Foundry is "
        "the platform you reach for when you need full control over models, vector stores, and tool code. Copilot "
        "Studio is the platform you reach for when you need a governed agent shipped to non-technical users this "
        "sprint. The second most common question is licensing. Copilot Studio is sold per message pack, with "
        "messages metered per generative-answer call, per autonomous action, and per tenant graph grounding. "
        "Authentication ships in three modes. No authentication is fine for a public marketing bot. Microsoft "
        "authentication wires Entra ID in two clicks. Manual authentication covers third-party OAuth providers such "
        "as GitHub or Salesforce. Knowledge sources span SharePoint, public websites, Dataverse, and custom "
        "uploaded files, and they can be combined per topic. Generative actions let the agent pick connectors at "
        "runtime instead of hard-coded topic routing, which is the feature that moves a Copilot Studio bot from "
        "scripted chatbot to true agent."
    ),
    "ckav1.35-objectives.pdf": (
        "The Certified Kubernetes Administrator exam, version 1.35, took effect in February 2025 and is the current "
        "release candidates sit through Linux Foundation testing. It is a two-hour, performance-based exam scored "
        "out of one hundred, with a passing mark of sixty-six. Every task runs in a real cluster, so candidates "
        "must be fluent with kubectl, kubeadm, and a text editor under time pressure. "
        "The exam covers five domains with fixed weights. Troubleshooting is the largest at thirty percent and "
        "covers cluster, node, application, and networking failure modes. Cluster Architecture, Installation, and "
        "Configuration follows at twenty-five percent and includes kubeadm bootstrap, HA control plane, etcd "
        "backup, and RBAC. Services and Networking sits at twenty percent and covers Services, Ingress, "
        "NetworkPolicy, CoreDNS, and the new Gateway API content added in this revision. Workloads and Scheduling "
        "comes in at fifteen percent and includes Deployments, rolling updates, ConfigMaps, Secrets, and resource "
        "limits. Storage rounds out the exam at ten percent and covers PersistentVolumes, PersistentVolumeClaims, "
        "StorageClasses, and access modes. "
        "The v1.35 revision adds Gateway API as a first-class objective, expands the troubleshooting domain to "
        "include containerd-level debugging, and assumes candidates can read structured logs through kubectl debug."
    ),
    "langgraph-hybrid-rag.md": (
        "WARNERCO Schematica is a seven-node LangGraph pipeline that demonstrates production-grade hybrid retrieval "
        "augmented generation for MCP teaching content. The graph is built around LangGraph's StateGraph with a "
        "typed state object that carries the user query, retrieved chunks, citations, and a running token budget "
        "between nodes. "
        "The seven nodes execute in sequence with one conditional fan-out. Node one is intent classification, which "
        "decides whether the query needs retrieval at all. Node two is query rewriting, which expands the user "
        "phrasing into search-friendly variants. Node three is the hybrid retriever itself, which runs a BM25 "
        "lexical search against an Azure AI Search index in parallel with a dense vector search against the same "
        "index, then reciprocal-rank-fuses the two result lists. Node four is a cross-encoder reranker that trims "
        "the fused list to the top eight chunks. Node five is context packing, which assembles the chunks into a "
        "token-budgeted prompt with inline citation anchors. Node six is generation against Claude Sonnet, with "
        "prompt caching keyed on the system prompt and the reranked chunks. Node seven is citation validation, "
        "which verifies every claim in the answer maps to a retrieved chunk before the response is returned. "
        "Observability is wired through LangSmith for trace inspection, and the entire graph is exposed to clients "
        "as a single MCP tool so a learner can invoke the pipeline from Claude Desktop without touching Python."
    ),
    "incident-runbook.txt": (
        "This runbook covers an on-call response to a production outage of the WARNERCO MCP server that fronts the "
        "Schematica retrieval pipeline. The server runs as a container in Azure Container Apps behind an internal "
        "Front Door, and clients reach it over streamable HTTP with bearer tokens issued by Entra ID. "
        "Step one is triage. Confirm the alert in Azure Monitor and check the Application Insights live metrics "
        "blade for request rate, failure rate, and P95 latency. If failure rate is above five percent for more than "
        "two minutes, declare an incident in the on-call channel and page the secondary. Step two is scope. Hit the "
        "health endpoint from your laptop with a fresh token, then from the Front Door, then from inside the "
        "container app environment. The first failing hop tells you whether the problem is the server, the "
        "ingress, or upstream identity. Step three is mitigation. If the server itself is unhealthy, roll back to "
        "the previous revision in Container Apps, which is a single CLI command and takes under thirty seconds. If "
        "Entra ID is the failing hop, switch the agent host to the break-glass static key stored in Key Vault and "
        "open a Microsoft support ticket. Step four is communication. Post a status update every fifteen minutes "
        "until resolution. Step five is the postmortem, which is due within forty-eight hours and must include a "
        "blameless timeline, contributing factors, and at least one preventative action with an owner and date."
    ),
}

# TODO: Write a tool to read a doc
# TODO: Write a tool to edit a doc
# TODO: Write a resource to return all doc id's
# TODO: Write a resource to return the contents of a particular doc
# TODO: Write a prompt to rewrite a doc in markdown format
# TODO: Write a prompt to summarize a doc


from pydantic import Field
from mcp.server.fastmcp.prompts import base


@mcp.tool(
    name="read_doc_contents",
    description="Read the contents of a document and return it as a string.",
)
def read_document(
    doc_id: str = Field(description="Id of the document to read"),
):
    if doc_id not in docs:
        raise ValueError(f"Doc with id {doc_id} not found")

    return docs[doc_id]


@mcp.tool(
    name="edit_document",
    description="Edit a document by replacing a string in the documents content with a new string",
)
def edit_document(
    doc_id: str = Field(description="Id of the document that will be edited"),
    old_str: str = Field(
        description="The text to replace. Must match exactly, including whitespace"
    ),
    new_str: str = Field(
        description="The new text to insert in place of the old text"
    ),
):
    if doc_id not in docs:
        raise ValueError(f"Doc with id {doc_id} not found")

    docs[doc_id] = docs[doc_id].replace(old_str, new_str)


@mcp.tool(
    name="summarize_via_sampling",
    description=(
        "Summarize a document by asking the client's own LLM to do it. "
        "Demonstrates MCP sampling — the server delegates generation back to the client."
    ),
)
async def summarize_via_sampling(
    ctx: Context,
    doc_id: str = Field(description="Id of the document to summarize"),
):
    if doc_id not in docs:
        raise ValueError(f"Doc with id {doc_id} not found")

    from mcp.types import SamplingMessage, TextContent

    await ctx.info(f"Sampling client LLM for summary of {doc_id}")

    result = await ctx.session.create_message(
        messages=[
            SamplingMessage(
                role="user",
                content=TextContent(
                    type="text",
                    text=(
                        "Summarize the following document in exactly two sentences. "
                        "No preamble, no markdown:\n\n"
                        f"{docs[doc_id]}"
                    ),
                ),
            )
        ],
        max_tokens=300,
        system_prompt="You are a precise technical summarizer.",
    )

    summary = result.content.text if hasattr(result.content, "text") else str(result.content)
    return f"[via client sampling]\n{summary}"


@mcp.tool(
    name="list_allowed_roots",
    description=(
        "Show the filesystem locations the client has declared as in-scope. "
        "Demonstrates MCP roots — the client tells the server which paths it "
        "is permitted to operate on for this session."
    ),
)
async def list_allowed_roots(ctx: Context) -> str:
    """Round-trip the roots/list request back to the client and format the reply.

    Returning a human-readable string (not raw JSON) keeps the demo legible
    when a learner calls this from a chat UI.
    """
    try:
        result = await ctx.session.list_roots()
    except Exception as exc:
        # A client that did not register a list_roots_callback returns an
        # ErrorData, which the SDK raises. Surface that as teachable output
        # rather than crashing the tool call.
        return f"Client did not advertise roots support: {exc}"

    if not result.roots:
        return "Client advertised roots support but declared zero roots."

    lines = ["Client-declared roots for this session:"]
    for r in result.roots:
        label = r.name or "(unnamed)"
        lines.append(f"  • {label} → {r.uri}")
    return "\n".join(lines)


class EditConfirmation(BaseModel):
    confirm: bool = Field(description="Type 'true' to apply the edit, 'false' to cancel.")
    reason: str = Field(default="", description="Optional reason for the decision (audit trail).")


@mcp.tool(
    name="edit_document_safely",
    description=(
        "Edit a document, but elicit user confirmation first. "
        "Demonstrates MCP elicitation — the server pauses mid-execution to ask the human."
    ),
)
async def edit_document_safely(
    ctx: Context,
    doc_id: str = Field(description="Id of the document that will be edited"),
    old_str: str = Field(description="Text to replace (exact match)"),
    new_str: str = Field(description="Replacement text"),
):
    if doc_id not in docs:
        raise ValueError(f"Doc with id {doc_id} not found")
    if old_str not in docs[doc_id]:
        return f"No change: '{old_str}' not found in {doc_id}."

    # Roots gate: refuse the edit unless the client has explicitly declared
    # the docs namespace as in-scope for this session. Graceful degradation
    # is intentional — older clients without roots support should still see
    # the elicitation flow rather than a hard failure.
    try:
        roots_result = await ctx.session.list_roots()
        declared = [str(r.uri) for r in roots_result.roots]
        if not any(uri.rstrip("/").endswith(DOCS_ROOT_MARKER) for uri in declared):
            return (
                f"Edit refused: client did not declare a docs root.\n"
                f"Declared roots: {declared or '(none)'}\n"
                f"Add a Root ending in '{DOCS_ROOT_MARKER}' to authorize doc edits."
            )
    except Exception as exc:
        await ctx.info(
            f"Roots check skipped (client does not support roots): {exc}"
        )

    preview = docs[doc_id].replace(old_str, new_str)
    result = await ctx.elicit(
        message=(
            f"About to edit '{doc_id}'.\n"
            f"BEFORE: {docs[doc_id]}\n"
            f"AFTER:  {preview}\n"
            "Apply this change?"
        ),
        schema=EditConfirmation,
    )

    if result.action != "accept" or not result.data or not result.data.confirm:
        reason = (result.data.reason if result.data else "") or "no reason given"
        return f"Edit cancelled ({result.action}): {reason}"

    docs[doc_id] = preview
    return f"Edit applied to {doc_id}. Reason: {result.data.reason or 'n/a'}"


class DeleteConfirmation(BaseModel):
    # Retype-the-name protection mirrors the GitHub "type the repository name
    # to confirm deletion" pattern. A boolean flag is muscle memory; retyping
    # forces eyes on the target. This is the production-realistic shape of an
    # elicitation schema, not just a yes/no toggle.
    typed_doc_id: str = Field(
        description="Retype the exact doc_id to confirm deletion. Anything else cancels."
    )
    reason: str = Field(
        default="", description="Why this deletion is happening (audit trail)."
    )
    hard_delete: bool = Field(
        default=False,
        description=(
            "If true, the document is purged permanently. If false (default), "
            "it moves to the soft-delete trash and can be observed via the "
            "docs://trash resource."
        ),
    )


@mcp.tool(
    name="delete_document",
    description=(
        "Delete a document with typed confirmation. Demonstrates a richer MCP "
        "elicitation schema (free-text validation plus a destructive-action flag) "
        "and shows the soft-delete vs hard-delete pattern."
    ),
)
async def delete_document(
    ctx: Context,
    doc_id: str = Field(description="Id of the document to delete"),
):
    if doc_id not in docs:
        # Idempotent: surface the state clearly rather than raising. An agent
        # that retries a transient error should not crash on the second pass.
        if doc_id in _trash:
            return f"No change: '{doc_id}' is already in the trash."
        return f"No change: '{doc_id}' does not exist."

    # Same roots gate as edit_document_safely. Destructive operations should
    # share the same authorization surface — diverging here would be a footgun.
    try:
        roots_result = await ctx.session.list_roots()
        declared = [str(r.uri) for r in roots_result.roots]
        if not any(uri.rstrip("/").endswith(DOCS_ROOT_MARKER) for uri in declared):
            return (
                f"Delete refused: client did not declare a docs root.\n"
                f"Declared roots: {declared or '(none)'}\n"
                f"Add a Root ending in '{DOCS_ROOT_MARKER}' to authorize doc deletes."
            )
    except Exception as exc:
        await ctx.info(
            f"Roots check skipped (client does not support roots): {exc}"
        )

    preview = docs[doc_id]
    snippet = (preview[:120] + "...") if len(preview) > 120 else preview
    result = await ctx.elicit(
        message=(
            f"DESTRUCTIVE ACTION: delete '{doc_id}'.\n"
            f"Preview: {snippet}\n"
            f"Type the exact doc_id to confirm. Set hard_delete=true to purge "
            f"immediately; otherwise the doc moves to the trash and can be "
            f"recovered via docs://trash."
        ),
        schema=DeleteConfirmation,
    )

    if result.action != "accept" or not result.data:
        return f"Delete cancelled ({result.action})."

    if result.data.typed_doc_id != doc_id:
        # Mismatch is treated as a cancel, not an error. The user typed
        # something — they were paying attention — they just typed wrong.
        return (
            f"Delete cancelled: typed '{result.data.typed_doc_id}' did not "
            f"match '{doc_id}'."
        )

    payload = docs.pop(doc_id)
    if result.data.hard_delete:
        return (
            f"Hard-deleted '{doc_id}'. Reason: "
            f"{result.data.reason or 'n/a'}. This cannot be undone."
        )

    _trash[doc_id] = payload
    return (
        f"Soft-deleted '{doc_id}' to trash. Reason: "
        f"{result.data.reason or 'n/a'}. Recover via docs://trash."
    )


@mcp.resource("docs://documents", mime_type="application/json")
def list_docs() -> list[str]:
    return list(docs.keys())


@mcp.resource("docs://documents/{doc_id}", mime_type="text/plain")
def fetch_doc(doc_id: str) -> str:
    if doc_id not in docs:
        raise ValueError(f"Doc with id {doc_id} not found")
    return docs[doc_id]


@mcp.resource("docs://trash", mime_type="application/json")
def list_trash() -> list[str]:
    # Exposing the trash as a resource (read-only) rather than a tool keeps
    # the destructive-action surface narrow: tools mutate, resources observe.
    return list(_trash.keys())


@mcp.prompt(
    name="format",
    description="Rewrites the contents of the document in Markdown format.",
)
def format_document(
    doc_id: str = Field(description="Id of the document to format"),
) -> list[base.Message]:
    prompt = f"""
    Your goal is to reformat a document to be written with markdown syntax.

    The id of the document you need to reformat is:
    <document_id>
    {doc_id}
    </document_id>

    Add in headers, bullet points, tables, etc as necessary. Feel free to add in extra text, but don't change the meaning of the report.
    Use the 'edit_document' tool to edit the document. After the document has been edited, respond with the final version of the doc. Don't explain your changes.
    """

    return [base.UserMessage(prompt)]


if __name__ == "__main__":
    mcp.run(transport="stdio")
