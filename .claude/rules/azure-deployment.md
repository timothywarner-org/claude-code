# Azure Deployment

How Python GenAI apps in this repo ship to Azure. Azure is the only target. Do not introduce or compare other clouds.

## Deploy with azd, not az

Use the **Azure Developer CLI (`azd`)** for provisioning and deployment. It runs provision and deploy steps in parallel and drives from an `azure.yaml` plus Bicep under `infra/`, so a clone reproduces the environment in one command.

```bash
azd auth login          # once, interactive
azd up                  # provision infra + build + deploy in one shot
azd provision           # infra only (Bicep)
azd deploy              # app only, against already-provisioned infra
azd down                # tear the environment down
```

Reach for the **`az` CLI only** when a task genuinely has no `azd` equivalent (a one-off resource inspection, an RBAC assignment azd does not manage). Never hand-author an `az` deploy pipeline when `azd up` covers it.

## Compute targets

| Workload shape | First choice | Why |
| --- | --- | --- |
| Containerized GenAI API or worker | **Azure Container Apps** | Scale-to-zero, managed identity, revisions |
| Simple web app or API, no container | **Azure App Service** | Fastest path for a single Python service |
| Event or queue-triggered inference | **Azure Functions** | Consumption billing for spiky load |

Default to **Container Apps** for anything that packages a model-serving loop.

## Identity, not keys

Provision a **managed identity** for the compute resource and grant it the data-plane role on the model resource (for Azure OpenAI, **Cognitive Services OpenAI User**). The app then authenticates with `DefaultAzureCredential` and holds **zero secrets**. The same code path that used your developer login locally uses the managed identity in Azure with no change. See [[secrets-security]].

## Model deployments

- A **model deployment** is a named, versioned endpoint for a model on your resource. The app targets the **deployment name**, not the model family, so you can swap the underlying version without a code change.
- Pin the model version in infrastructure (Bicep), not in application code, so upgrades are a reviewed infra change.
- Set explicit **capacity / TPM** on each deployment. An unset quota is a production incident waiting to happen.

## Gate the deploy

No promotion to a shared environment until the evaluation suite passes its thresholds. The deploy step reads the eval result and refuses on a fail. See [[genai-prompt-eval]] and [[testing]].

## Grounding

When you need current Azure service behavior, portal paths, or SDK shapes, query the **Microsoft Learn MCP** server and the **azure** MCP tools rather than reciting from memory. Azure surfaces move; confirm before you assert.

## Related

- [[python-genai]] - the app code that ships here.
- [[secrets-security]] - identity and secret handling.
