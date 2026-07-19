---
name: azure-bicep-skill
description: Use when authoring, reviewing, or refactoring Azure Bicep code. Triggers on Bicep module design, Azure Verified Modules (AVM) selection, landing zone IaC, .bicepparam parameter files, what-if deployment validation, bicepconfig.json linting, GitHub Actions Bicep CI with OIDC, Key Vault secret references, and any decision about Bicep file structure, naming, tagging, or scope (resourceGroup, subscription, managementGroup, tenant).
---

# Azure Bicep Skill

Microsoft's proven-practice guidance for production Bicep deployments, distilled. Use this skill whenever Bicep code is being authored, reviewed, or refactored, or when picking between custom modules and Azure Verified Modules.

## When to use

Trigger this skill when you see any of the following:

- A `.bicep` or `.bicepparam` file being created, edited, or reviewed
- A request involving "landing zone," "AVM," "Azure Verified Module," "what-if," or "bicepconfig"
- A question about Bicep scopes (`targetScope`), parameter typing, or output design
- A GitHub Actions workflow that deploys Bicep
- A choice between Bicep and Terraform (Bicep is the default for Tim's stack; only deviate with explicit justification)
- A custom module being proposed when an AVM module exists for the same resource

Do **not** trigger for: pure ARM JSON work (recommend converting to Bicep first), Terraform-only workflows, Azure portal click-ops walkthroughs.

## Core principles

### 1. AVM first, custom second

**Azure Verified Modules** are Microsoft-published, WAF-aligned, versioned Bicep modules in the public Bicep Registry. They have built-in support for diagnostics, managed identities, private endpoints, RBAC assignments, and tagging. Prefer them over hand-rolled modules.

**Why:** AVM modules are maintained by the product groups, tested across regions, and updated for breaking API changes. Reinventing them is technical debt you will pay forever.

```bicep
// Preferred: AVM resource module, version-pinned
module storage 'br/public:avm/res/storage/storage-account:0.14.3' = {
  name: 'storage-deployment'
  params: {
    name: storageAccountName
    location: location
    skuName: 'Standard_GRS'
    tags: tags
  }
}
```

See `references/AVM-GUIDE.md` for the module catalog, the resource (`res`) vs pattern (`ptn`) distinction, and version-pinning strategy.

### 2. Strong types and decorators on every param

Bicep parameters should be self-documenting and self-validating.

```bicep
@description('Cost center for chargeback. Must match Finance master list.')
@minLength(4)
@maxLength(8)
param costCenter string

@description('Environment tier. Drives SKU selection and retention policies.')
@allowed([
  'dev'
  'test'
  'prod'
])
param environment string

@description('Admin password. Sourced from Key Vault via getSecret().')
@secure()
param sqlAdminPassword string
```

**Why:** Decorators turn deployment-time mistakes into authoring-time errors. `@allowed` is your cheapest policy enforcement.

### 3. Secrets come from Key Vault, never parameters

Never accept a secret as a plain parameter. Reference an existing Key Vault and pull the secret via `getSecret()`:

```bicep
resource kv 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
  scope: resourceGroup(keyVaultRgName)
}

module sql 'br/public:avm/res/sql/server:0.10.0' = {
  name: 'sql-deployment'
  params: {
    name: sqlServerName
    location: location
    administratorLoginPassword: kv.getSecret('sql-admin-password')
  }
}
```

**Why:** Secret values passed as parameters end up in deployment history, CLI scrollback, and CI logs. `getSecret()` keeps them inside the ARM control plane only.

See `references/SECURITY.md` for managed identity patterns and OIDC federation.

### 4. CAF naming and mandatory tags

Follow Cloud Adoption Framework naming: `<resource-type>-<workload>-<env>-<region>-<instance>`. Use `uniqueString()` only for globally-scoped resources where collisions are real (storage accounts, Key Vaults, App Service plans hosting custom domains).

```bicep
var namePrefix = 'kv-${workload}-${environment}-${location}'
var keyVaultName = '${namePrefix}-${take(uniqueString(resourceGroup().id), 4)}'

var mandatoryTags = {
  Environment: environment
  CostCenter: costCenter
  Owner: ownerEmail
  Workload: workload
  ManagedBy: 'Bicep'
}
```

See `references/NAMING-AND-TAGGING.md` for the full CAF table and tag governance.

### 5. Explicit `targetScope`, even when it's the default

Always declare `targetScope` at the top of the file. The default is `resourceGroup`, but stating it removes ambiguity for reviewers and prevents accidental scope mismatch when modules are reused.

```bicep
targetScope = 'subscription'

@description('Landing zone resource group name.')
param resourceGroupName string

resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
  tags: mandatoryTags
}
```

### 6. Symbolic references over `dependsOn`

Bicep infers dependencies from symbolic references. Manual `dependsOn` arrays are usually a sign of a missing reference or a circular design.

```bicep
// Preferred: dependency is implicit via storage.outputs.resourceId
module diagnostics 'modules/diagnostics.bicep' = {
  name: 'diag-deployment'
  params: {
    targetResourceId: storage.outputs.resourceId
    logAnalyticsWorkspaceId: laws.outputs.resourceId
  }
}
```

**Why:** Explicit `dependsOn` masks the actual data flow and breaks when modules are reordered or refactored.

### 7. Outputs are the contract, never the secret store

Outputs are read by humans and by downstream modules. They appear in deployment history. Output resource IDs, names, and endpoints. **Never output a secret value.** If a caller needs a secret, give them the Key Vault URI and let them call `getSecret()`.

### 8. what-if before create, always

```pwsh
az deployment sub what-if `
  --location eastus2 `
  --template-file main.bicep `
  --parameters main.bicepparam
```

Read every `Modify`, `Delete`, and `DeployIgnored` line. `what-if` is the closest thing Bicep has to a dry-run, and it catches drift, accidental deletes, and parameter mistakes before they become incidents.

## Workflow

When generating or reviewing Bicep, walk this loop:

1. **Scope check.** Confirm `targetScope` matches the intended deployment scope. Subscription scope for landing zones, resourceGroup for workload deployments.
2. **AVM check.** For every resource being created, search the AVM registry. If a module exists, use it. If it doesn't, document why a custom module is needed.
3. **Parameter audit.** Every param has `@description`. Strings have `@allowed` or length constraints where the value space is bounded. Secrets are `@secure()` and sourced from Key Vault.
4. **Identity audit.** No service principal secrets. Managed identities for service-to-service auth. Key Vault role assignments via AVM module's `roleAssignments` parameter.
5. **Naming and tags.** CAF naming convention. Mandatory tag set applied at the resource-group or subscription level and inherited.
6. **Output audit.** Outputs are minimal, named, typed, and contain no secret values.
7. **Validation.** Run `bicep build` (syntax), `bicep lint` (style, with `bicepconfig.json`), and `az deployment <scope> what-if` (deployment diff).
8. **CI integration.** Ensure the change is reachable from a GitHub Actions workflow that uses OIDC, runs `what-if`, requires manual approval for prod, and posts the diff to the PR.

## Validation commands

**Preferred: run all four gates at once via the bundled script.**

```pwsh
# All four gates: build + lint + AVM version-pin scan + what-if
./scripts/validate-bicep.ps1 `
  -TemplateFile main.bicep `
  -ParametersFile main.bicepparam `
  -Scope subscription `
  -Location eastus2

# Local authoring loop (skip the tenant call)
./scripts/validate-bicep.ps1 `
  -TemplateFile main.bicep `
  -ParametersFile main.bicepparam `
  -SkipWhatIf
```

The `scripts/validate-bicep.ps1` script wraps the four mandatory pre-deploy gates (build, lint, AVM version-pin scan, what-if) and exits non-zero on any failure. Use it as the local pre-commit check and as the CI gate. It is the executable counterpart of this skill's guidance.

**Individual gates** (when you need to run one in isolation):

```pwsh
# Syntax + transpile check
bicep build main.bicep

# Lint with project rules
bicep lint main.bicep

# Subscription-scope what-if
az deployment sub what-if `
  --location eastus2 `
  --template-file main.bicep `
  --parameters main.bicepparam

# Subscription-scope deploy (only after what-if review)
az deployment sub create `
  --location eastus2 `
  --template-file main.bicep `
  --parameters main.bicepparam

# PSRule for Azure (policy compliance, complementary to the gates above)
Invoke-PSRule -InputPath . -Module 'PSRule.Rules.Azure'
```

## Anti-patterns to flag

| Anti-pattern | Why it's wrong | What to do instead |
|---|---|---|
| Hardcoded subscription ID or tenant ID | Breaks portability, leaks tenant info into source | Use `subscription().subscriptionId` and `tenant().tenantId` |
| Inline secret in parameter file | Secret hits git history and CI logs | Key Vault reference via `getSecret()` |
| `dependsOn` array | Hides real data flow, breaks on refactor | Symbolic reference (`module.outputs.x`) |
| Custom module for a resource AVM covers | Reinventing maintained code | Use the AVM module, pin the version |
| `@secure()` missing on secret params | Secret value rendered in deployment history | Add `@secure()`, source from Key Vault |
| Outputting a secret | Secret appears in deployment outputs | Output the Key Vault URI instead |
| JSON ARM where Bicep would work | Loses type safety, decorators, linting | Convert with `bicep decompile` then refactor |
| No `targetScope` declaration | Ambiguous deployment scope | Declare it explicitly at the top of the file |
| `uniqueString()` on every name | Names become unreadable in the portal | Use only for globally-scoped resources |
| Service principal with client secret | Long-lived credential, rotation burden | Managed identity, or OIDC federation for CI |

## Tim's stack defaults

When generating Bicep for this environment, assume:

- **IaC**: Bicep first. Terraform only when Bicep cannot do the job (multi-cloud, third-party providers).
- **CI/CD**: GitHub Actions in `timothywarner-org`, OIDC federated credentials, no stored secrets.
- **Identity**: Entra ID. Managed identities (system-assigned preferred, user-assigned when shared across resources).
- **Secrets**: Azure Key Vault, referenced via `getSecret()` and managed identity.
- **Compute targets**: Azure Container Apps, AKS, Functions, App Service.
- **Data targets**: Cosmos DB, Azure SQL, Storage Account with hierarchical namespace, Azure AI Search.
- **Region default**: `eastus2` unless specified.
- **Tagging**: `Environment`, `CostCenter`, `Owner`, `Workload`, `ManagedBy` are mandatory.

Deviation from these defaults requires an explicit justification in the response.

## Bundled scripts

- `scripts/validate-bicep.ps1` — Runs all four pre-deploy gates (build, lint, AVM version-pin scan, what-if) in one shot. PowerShell 7+. Use locally before commit and in CI as a gate. See the **Validation commands** section above for invocation examples.

## Reference files

- `references/AVM-GUIDE.md` — Azure Verified Modules catalog, registry naming, version-pinning strategy

Additional reference files (`NAMING-AND-TAGGING.md`, `SECURITY.md`, `CI-CD.md`) and starter templates under `assets/templates/` may be added as the skill matures. Until then, follow the inline guidance in this SKILL.md and the AVM guide.
