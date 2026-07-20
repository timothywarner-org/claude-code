---
name: project-azure-keyless
description: The field-service assistant must authenticate to Azure model endpoints with managed identity, never an API key.
metadata:
  type: project
---

The **field-service assistant** (the Python GenAI app in this track) has a standing constraint: it authenticates to every Azure model endpoint with **`DefaultAzureCredential`** backed by a **managed identity** in Azure. No API key appears in code, config, or a committed `.env`, in any environment. This was set on 2026-07-20 and holds until the project owner says otherwise.

**Why:** The app runs in a regulated environment where a leaked key is a reportable incident. Removing the key entirely - not just hiding it - removes the whole class of leak, and lets the identical code path run under the developer's login locally and the managed identity in production.

**How to apply:** When touching client construction, use `get_bearer_token_provider(DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default")` and pass it as `azure_ad_token_provider`. Reject any change that reintroduces an `api_key=` argument or reads a key from the environment. See [[secrets-security]] and [[azure-deployment]].
