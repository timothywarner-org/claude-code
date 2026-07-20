# Secrets and Security

Non-negotiable rules for handling credentials and sensitive data in this repo. A violation here blocks the commit.

## No secrets in code, ever

- No API keys, connection strings, passwords, or tokens in source, notebooks, comments, or committed `.env` files.
- Read every secret from an **environment variable** or a **managed identity**. Ship `.env.example` with variable names and empty values; the real `.env` is gitignored.
- If a secret reaches git history, treat it as compromised: **rotate it first**, then scrub history. Rotation is the fix; deletion alone is not.

## Prefer identity over secrets

The best secret is the one that does not exist. Authenticate to Azure with **`DefaultAzureCredential`** and a **managed identity** on Azure compute, so there is no key to leak, store, or rotate.

```python
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
token_provider = get_bearer_token_provider(
    DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
)
# Pass token_provider to the client. No api_key argument.
```

`DefaultAzureCredential` tries credentials in order: environment, managed identity, Azure CLI login, and more. The same line runs under your developer identity locally and the managed identity in Azure.

## When a secret is unavoidable

Some third-party services still issue keys. For those:

- Store the value in **Azure Key Vault**.
- Grant the app's managed identity **get/list** on that secret; the app reads it at startup via the Key Vault SDK.
- Never copy a Key Vault value into an app setting in plaintext. Use a **Key Vault reference** so the value is resolved at runtime and never rendered into config.

## Input handling for GenAI

- Validate and bound every user input with **pydantic** before it reaches a model call.
- Treat model output as untrusted. Do not `eval`/exec it, pass it to a shell, or interpolate it into a query without escaping.
- Strip or redact PII before it enters a prompt or a log. A prompt is a data flow; govern it like one.

## Errors do not leak

Catch exceptions and return a clean message. Never surface a raw stack trace, endpoint, resource id, or token fragment to a user or an unfiltered log.

## Pre-commit gate

Before any commit: no hardcoded secrets, all inputs validated, error messages do not leak internals, and any newly touched credential path uses identity or Key Vault, not an inline value.

## Related

- [[azure-deployment]] - managed identity provisioning and role assignment.
- [[python-genai]] - keyless client construction.
