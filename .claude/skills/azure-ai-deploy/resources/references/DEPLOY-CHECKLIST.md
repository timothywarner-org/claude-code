# Pre-deploy gate

Clear every gate before promoting a Python GenAI app to Azure. Each item is pass or fail, no partial credit.

## Gate 1: Quality

- [ ] **Evals passed.** The prompt-eval suite (see the `genai-prompt-eval` skill) ran on the current build and met the groundedness, relevance, coherence, and safety thresholds.
- [ ] **No regressions** against the last shipped baseline scores.

## Gate 2: Security

- [ ] **No API keys in code, config, or committed `.env`.** The client uses `azure_ad_token_provider`.
- [ ] **Secrets stored in Azure Key Vault.** Any value that must persist (a third-party token, a connection string) is a Key Vault secret referenced by URI, not an inline string.
- [ ] **App identity holds Cognitive Services OpenAI User** on the Azure OpenAI resource, and nothing broader.
- [ ] **Managed identity enabled** on the target Azure compute resource.

## Gate 3: Configuration

- [ ] `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_DEPLOYMENT` are set in the target environment.
- [ ] `preflight.py` exits zero.
- [ ] `azure.yaml` names the correct service, host, and Python project path.

## Gate 4: Provision and deploy with azd

`azd` runs provisioning and deployment as separate, idempotent steps. Re-running either is safe.

```bash
# 1. Authenticate the CLI to the target tenant and subscription
azd auth login

# 2. Provision infrastructure (resource group, Container Apps env, identity, role assignments)
azd provision

# 3. Build the container and deploy the app
azd deploy

# 4. Confirm the running service resolves its identity and answers a request
azd show
```

## Gate 5: Post-deploy smoke

- [ ] The deployed app returns a valid chat completion using its managed identity.
- [ ] No key appears in application logs, environment dumps, or the container image.
- [ ] Application logs and metrics flow to **Azure Monitor**.
