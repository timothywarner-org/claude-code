# Azure Verified Modules (AVM) Guide

Microsoft's curated, WAF-aligned Bicep module library. Maintained by product groups, versioned, and published to the **public Bicep Registry**.

## Why AVM exists

Custom Bicep modules accumulate drift. Every team writes its own `storage-account.bicep`, each one slightly different, each one missing a different feature (diagnostics, private endpoint, customer-managed keys, RBAC). AVM solves this by giving you one canonical module per resource type, owned by Microsoft, with full WAF coverage baked in.

**What you get for free with an AVM module:**

- Diagnostic settings wired to Log Analytics
- Private endpoint support with DNS zone integration
- Customer-managed key (CMK) encryption where applicable
- RBAC role assignments via a `roleAssignments` parameter
- Managed identity (system or user-assigned) wired in
- Lock support (`CanNotDelete`, `ReadOnly`)
- Consistent tagging
- Telemetry opt-out (`enableTelemetry`)

Reinventing those features per project is the single biggest source of Bicep technical debt.

## Module types: resource vs pattern

| Type | Naming | Purpose | Example |
|---|---|---|---|
| **Resource (`res`)** | `br/public:avm/res/<provider>/<service>:<version>` | Single Azure resource, fully parameterized | `br/public:avm/res/storage/storage-account:0.14.3` |
| **Pattern (`ptn`)** | `br/public:avm/ptn/<pattern-name>:<version>` | Multi-resource architecture pattern | `br/public:avm/ptn/aks-production:0.4.0` |

**Rule of thumb:** start with **resource modules** as building blocks. Reach for **pattern modules** only when the pattern matches your architecture exactly. Patterns are opinionated and harder to customize.

## Registry naming convention

```
br/public:avm/res/<provider>/<service>:<version>
└┬┘ └────┬───┘ └┬┘ └───┬──┘ └───┬──┘ └───┬───┘
 │       │      │     │        │        │
 │       │      │     │        │        └─ Semantic version, MUST be pinned
 │       │      │     │        └────────── Service name (kebab-case)
 │       │      │     └─────────────────── Azure resource provider (lowercase)
 │       │      └───────────────────────── Resource module
 │       └──────────────────────────────── AVM namespace
 └──────────────────────────────────────── Public Bicep Registry
```

## Version-pinning strategy

**Always pin to a specific version.** Never use `latest` or omit the version. AVM follows semver, and breaking changes happen in major and (per AVM policy) minor versions during pre-1.0.

```bicep
// Correct: version pinned
module kv 'br/public:avm/res/key-vault/vault:0.11.1' = { ... }

// Wrong: floating version (will not work, registry requires version)
module kv 'br/public:avm/res/key-vault/vault' = { ... }
```

**Upgrade cadence:**

1. Check the module's CHANGELOG before bumping.
2. Run `az deployment <scope> what-if` against a non-prod environment.
3. Read every `Modify` line. Pay attention to API version bumps that may trigger resource replacement.
4. Bump in a dedicated PR, not bundled with feature work.

## Finding the right module

| Where to look | What it gives you |
|---|---|
| `https://aka.ms/avm` | AVM landing page, links to module index |
| `https://github.com/Azure/bicep-registry-modules/tree/main/avm/res` | Source for every resource module |
| `https://github.com/Azure/bicep-registry-modules/tree/main/avm/ptn` | Source for every pattern module |
| MCP: `microsoft_docs_search` | Search "Azure Verified Module <service>" |

For each module, read:

- `README.md` (parameter table, examples)
- `main.bicep` (the actual module source)
- `tests/e2e/` (working examples for common scenarios)
- `version.json` (current version)

## When to write a custom module

Justified reasons:

- AVM has no module for the resource yet (check the index first)
- The AVM module is missing a critical feature and a PR is in flight (link the PR in a comment)
- You're combining 3+ AVM modules into a workload-specific composition (this is itself a candidate for an internal pattern module)

Not justified:

- "I want different parameter names"
- "I want fewer parameters" (wrap the AVM module with your own thin wrapper instead)
- "The AVM module is too complex" (you can pass only the params you need; everything else has defaults)

## Wrapping an AVM module

When you need a project-specific default set on top of an AVM module, wrap it:

```bicep
// modules/our-storage.bicep
@description('Storage account name. Globally unique.')
param name string

@description('Location for the storage account.')
param location string

@description('Tags applied to all resources.')
param tags object

// Project default: always GRS, always TLS 1.2, always diagnostics to the shared LAWS
module storage 'br/public:avm/res/storage/storage-account:0.14.3' = {
  name: 'storage-${name}'
  params: {
    name: name
    location: location
    tags: tags
    skuName: 'Standard_GRS'
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    diagnosticSettings: [
      {
        workspaceResourceId: sharedLawsId
      }
    ]
  }
}

output resourceId string = storage.outputs.resourceId
output primaryBlobEndpoint string = storage.outputs.primaryBlobEndpoint
```

This gives you AVM's coverage plus your project's opinions in one place.

## Common AVM modules (Tim's stack)

| Service | Module path |
|---|---|
| Storage Account | `br/public:avm/res/storage/storage-account` |
| Key Vault | `br/public:avm/res/key-vault/vault` |
| Log Analytics Workspace | `br/public:avm/res/operational-insights/workspace` |
| Application Insights | `br/public:avm/res/insights/component` |
| Container Apps Environment | `br/public:avm/res/app/managed-environment` |
| Container App | `br/public:avm/res/app/container-app` |
| AKS | `br/public:avm/res/container-service/managed-cluster` |
| Function App | `br/public:avm/res/web/site` (with `kind: 'functionapp'`) |
| App Service | `br/public:avm/res/web/site` |
| Cosmos DB | `br/public:avm/res/document-db/database-account` |
| Azure SQL Server | `br/public:avm/res/sql/server` |
| Azure AI Search | `br/public:avm/res/search/search-service` |
| Virtual Network | `br/public:avm/res/network/virtual-network` |
| Private DNS Zone | `br/public:avm/res/network/private-dns-zone` |
| User-Assigned Managed Identity | `br/public:avm/res/managed-identity/user-assigned-identity` |

Versions move; always look up the current version before pinning.
