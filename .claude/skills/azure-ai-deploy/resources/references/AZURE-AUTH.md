# Keyless authentication for Azure OpenAI

The keyless pattern replaces a static **API key** with a short-lived **Microsoft Entra ID access token**. The token is minted on demand for the caller's identity and expires on its own, so there is no long-lived secret to store, rotate, or leak.

## Why no API keys in code

- A key in source, config, or a `.env` committed to git is a standing credential that anyone with read access can copy.
- A key does not identify **who** called, so audit trails collapse to one shared identity.
- Rotating a leaked key means editing every consumer. A token needs no rotation because it is minted fresh each request and expires in minutes.

Store nothing. Grant a role instead.

## How DefaultAzureCredential resolves an identity

`DefaultAzureCredential` tries a chain of credential sources in order and uses the first one that produces a token. The same code runs unchanged locally and in the cloud:

| Environment | Identity source that resolves |
| --- | --- |
| Local dev workstation | Azure CLI sign-in (`az login`), then Azure Developer CLI, then a VS Code sign-in |
| Azure compute (Container Apps, App Service, AKS, VM) | The resource's **managed identity** |
| CI/CD runner | A **workload identity** or service principal via environment variables |

The application code passes a **bearer token provider** to the client. The provider requests a token for the scope `https://cognitiveservices.azure.com/.default` and refreshes it before expiry.

```python
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

token_provider = get_bearer_token_provider(
    DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
)
```

## Managed identity on Azure compute

When the app runs on Azure compute, enable a **managed identity** on that resource. Azure injects the identity, and `DefaultAzureCredential` resolves it with no code change and no secret in the environment.

Two forms exist:

- **System-assigned** - tied to the lifecycle of one resource. Deleted with the resource. Good default for a single app.
- **User-assigned** - a standalone identity you attach to one or more resources. Good when several services share one role assignment.

## The role the app identity needs

Grant the app identity the built-in role **Cognitive Services OpenAI User** on the Azure OpenAI resource. That role permits inference calls (chat completions, embeddings) without granting management-plane rights. Assign nothing broader.

```bash
az role assignment create \
  --assignee "<app-identity-object-id>" \
  --role "Cognitive Services OpenAI User" \
  --scope "<azure-openai-resource-id>"
```

## Local developer setup

```bash
az login
# Confirm the signed-in identity holds the Cognitive Services OpenAI User role
# on the target resource, then run the app. No key is set anywhere.
```
