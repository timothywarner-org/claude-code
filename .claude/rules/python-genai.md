# Python GenAI Development

Conventions for the generative-AI Python code in this repo. These apply to any `.py` under a GenAI demo or app directory.

## Package management: uv first

Use **uv**, not bare pip. Every GenAI app or demo is its own uv project with a `pyproject.toml` and a committed `uv.lock`.

```bash
uv init                 # new project
uv add openai azure-identity azure-ai-projects   # add deps (writes pyproject + lock)
uv run app.py           # run inside the managed venv, no activate step
uv sync                 # reproduce the locked env on a fresh clone
```

pip with `requirements.txt` is a **fallback only**, for boxes where uv is not available.

## Client construction: keyless by default

Never put an API key in code, a notebook, or a committed `.env`. Authenticate to Azure model endpoints with **`DefaultAzureCredential`** so the same code runs under your developer identity locally and a **managed identity** in Azure, with no code change.

```python
import os
from openai import AzureOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

# Bearer token provider fetches and refreshes an Entra ID token for the resource.
token_provider = get_bearer_token_provider(
    DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
)

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    azure_ad_token_provider=token_provider,   # no api_key
    api_version="2024-05-01-preview",
)

response = client.chat.completions.create(
    model=os.environ["AZURE_OPENAI_DEPLOYMENT"],   # the deployment name, not the model family
    messages=[{"role": "user", "content": "Summarize the Q3 field-service report."}],
)
print(response.choices[0].message.content)
```

For an **Azure AI Foundry** project, get the OpenAI client off the project client so model, endpoint, and telemetry come from one place:

```python
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential

project_client = AIProjectClient(
    endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
    credential=DefaultAzureCredential(),
)
with project_client.get_openai_client() as openai_client:
    response = openai_client.responses.create(
        model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
        input="Draft an onboarding checklist for a new field technician.",
    )
    print(response.output_text)
```

## Configuration

- Every endpoint, deployment name, and resource id is read from an **environment variable**, never hardcoded. Ship a `.env.example` that names every variable with empty values; the real `.env` is gitignored.
- The **deployment name** and the **model family** are different strings. Pass the deployment name to `model=`. State which is which in comments where it is not obvious.

## Async and streaming

- Use the `.aio` client variants for concurrent request fan-out; do not thread the synchronous client.
- Stream token-by-token for any user-facing chat surface so first-token latency is visible. Batch jobs do not need streaming.

## Structure

- One responsibility per module. Keep the model-call layer, the prompt-assembly layer, and the app/transport layer in separate files.
- Prompts are data, not code. Store prompt templates as files or constants you can diff and evaluate, not inline f-strings scattered across call sites. See [[genai-prompt-eval]] for how prompt changes get gated.
- Validate every external input with **pydantic** before it reaches a model call.

## Related

- [[azure-deployment]] - how this code ships to Azure.
- [[secrets-security]] - the secrets and identity rules in full.
