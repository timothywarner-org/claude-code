---
name: azure-ai-deploy
description: Ship a Python generative-AI app to Azure the keyless way, using DefaultAzureCredential and azd. Use when deploying a Python GenAI service, wiring an Azure OpenAI client without API keys, provisioning managed identity for Azure compute, running a pre-deploy gate, or building an azure.yaml for a container app. Triggers on "deploy to Azure", "keyless Azure OpenAI", "DefaultAzureCredential", "azd provision", "managed identity", "no API keys in code".
allowed-tools: Read, Glob, Grep, Bash, Edit, Write
---

# Ship a Python GenAI app to Azure (keyless)

This skill deploys a Python generative-AI service to Azure with **no API keys in source**. Authentication is via **Microsoft Entra ID token** (`DefaultAzureCredential`) locally and **managed identity** on Azure compute. Deployment runs through **azd** (Azure Developer CLI), which provisions and deploys in one workflow.

## When to reach for this

- You have a Python GenAI app (chat, RAG, agent) that calls **Azure OpenAI** and you want it in Azure.
- You want the **keyless** pattern so no secret is stored in code, config, or environment.
- You need a repeatable **pre-deploy gate** before a live class or a production push.

## Workflow

### 1. Read the auth pattern first

Read `resources/references/AZURE-AUTH.md`. It covers why keys stay out of code, how `DefaultAzureCredential` resolves an identity across local and cloud, and which RBAC role the app identity needs on the Azure OpenAI resource.

### 2. Scaffold the client and config

Copy the templates into the target project and edit for the real service:

- `resources/templates/chat_client.py` - keyless Azure OpenAI client. Reads endpoint and deployment from env vars. No key.
- `resources/templates/azure.yaml` - minimal **azd** config for a Python container app.

### 3. Set required environment

The app reads two values from the process environment, never from hardcoded strings:

- `AZURE_OPENAI_ENDPOINT` - the resource endpoint, for example `https://contoso-aoai.openai.azure.com/`
- `AZURE_OPENAI_DEPLOYMENT` - the model deployment name, for example `gpt-4o-chat`

### 4. Run preflight

```bash
uv run python ${CLAUDE_SKILL_DIR}/resources/scripts/preflight.py
```

The script verifies both env vars are set and non-empty. It exits non-zero when a value is missing, so it fails a CI step before any provisioning starts.

### 5. Work the deploy checklist

Read `resources/references/DEPLOY-CHECKLIST.md` and clear every gate: evals passed, secrets stored in **Azure Key Vault**, then `azd provision` followed by `azd deploy`.

## Conventions

- **uv** manages Python, not pip. Run scripts with `uv run`.
- **No key strings.** The client uses `azure_ad_token_provider`, never `api_key`.
- **Least privilege.** Grant the app identity the **Cognitive Services OpenAI User** role, nothing broader.
- **Azure only.** This skill targets Azure services end to end.
