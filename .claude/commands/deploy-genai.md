---
description: Walk a Python GenAI app through the pre-deploy gate and azd deploy to Azure, keyless.
argument-hint: "[environment name, e.g. staging]"
---

# /deploy-genai

Ship the current Python GenAI app to Azure the keyless way. Target environment: **$1** (default to `staging` if empty).

Follow this order and stop at the first gate that fails.

1. **Run the eval gate.** Invoke the `genai-prompt-eval` skill against the app's eval cases. If any dimension is below threshold, **stop** and report the failing dimension. A prompt regression does not ship. See [[testing]].

2. **Confirm keyless auth.** Verify the client uses `DefaultAzureCredential` + `get_bearer_token_provider`, with no `api_key=` argument and no key read from the environment. If a key path is present, **stop** and fix it first. See [[secrets-security]].

3. **Preflight env.** Run the `azure-ai-deploy` skill's `preflight.py` to confirm `AZURE_OPENAI_ENDPOINT` and the deployment name are set. Non-zero exit **stops** the deploy.

4. **Provision and deploy with azd.** Run `azd provision` then `azd deploy` (or `azd up` for a fresh environment) against **$1**. Do not hand-write `az` deploy commands. See [[azure-deployment]].

5. **Verify.** Hit the deployed endpoint with one smoke request and confirm a grounded response, then report the deployment URL and the eval scores that gated it.

Use the **azure** MCP tools and **Microsoft Learn MCP** to confirm any current portal path or SDK shape before asserting it.
