"""Keyless Azure OpenAI chat client.

Authenticates with a Microsoft Entra ID token from DefaultAzureCredential
instead of an API key. The same code runs locally (Azure CLI sign-in) and on
Azure compute (managed identity). No secret is stored in code or environment.

Required environment variables:
    AZURE_OPENAI_ENDPOINT    Resource endpoint, e.g. https://contoso-aoai.openai.azure.com/
    AZURE_OPENAI_DEPLOYMENT  Model deployment name, e.g. gpt-4o-chat

Run with uv:
    uv run python chat_client.py
"""

from __future__ import annotations

import os
import sys

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AzureOpenAI


def build_client() -> AzureOpenAI:
    """Return an AzureOpenAI client wired for keyless Entra ID auth.

    Raises:
        KeyError: if AZURE_OPENAI_ENDPOINT is not set in the environment.
    """
    # The scope is the fixed audience for Azure Cognitive Services token requests.
    token_provider = get_bearer_token_provider(
        DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
    )
    return AzureOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        azure_ad_token_provider=token_provider,
        api_version="2024-05-01-preview",
    )


def ask(client: AzureOpenAI, prompt: str) -> str:
    """Send one chat prompt and return the assistant reply text.

    Args:
        client: A configured AzureOpenAI client.
        prompt: The user message.

    Returns:
        The assistant's reply content.
    """
    response = client.chat.completions.create(
        model=os.environ["AZURE_OPENAI_DEPLOYMENT"],
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content or ""


def main() -> int:
    """Run a single grounded prompt as a smoke test. Returns a process exit code."""
    try:
        client = build_client()
        answer = ask(
            client,
            "In one sentence, summarize the benefit of keyless authentication for a cloud service.",
        )
    except KeyError as missing:
        # A required env var is absent. Fail loud so a CI step catches it.
        print(f"Missing required environment variable: {missing}", file=sys.stderr)
        return 1
    except Exception as error:  # noqa: BLE001 - surface any client or auth failure to the operator
        print(f"Chat request failed: {error}", file=sys.stderr)
        return 1

    print(answer)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
