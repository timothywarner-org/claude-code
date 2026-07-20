targetScope = 'resourceGroup'

// DocumentMCP demo server infrastructure.
//
// Deploys the stateless FastMCP teaching server (mcp-example/mcp_cli) to Azure
// Container Apps on the Consumption plan, scaled to zero when idle. The server
// holds all state in an in-process dict (see mcp_server.py) and calls no other
// Azure service, so this template is deliberately minimal: no Key Vault (no
// secrets exist), no Storage (nothing to persist), no Log Analytics /
// Application Insights (no observability requirement was named for a teaching
// demo). See the infra README for the full list of cuts and why.

@description('Environment name used by azd to derive resource names and as the resource token seed. Matches the azd environment, not an app-tier label.')
@minLength(1)
@maxLength(64)
param environmentName string

@description('Azure region for all resources. Must support Container Apps Consumption plan.')
param location string = resourceGroup().location

@description('Container image reference to deploy. azd overwrites this at deploy time after building and pushing to the registry provisioned below; the default lets the first `azd provision` succeed before any image exists.')
param containerImage string = 'mcr.microsoft.com/k8se/quickstart:latest'

// CAF-ish naming, kept short because Container Registry names must be
// globally unique, alphanumeric only, and <= 50 chars.
var resourceToken = toLower(uniqueString(subscription().id, resourceGroup().id, environmentName))
var containerAppName = 'ca-docmcp-${resourceToken}'
var containerAppsEnvName = 'cae-docmcp-${resourceToken}'
var containerRegistryName = 'crdocmcp${resourceToken}'
var managedIdentityName = 'id-docmcp-${resourceToken}'

var tags = {
  Environment: environmentName
  Workload: 'documentmcp-demo'
  ManagedBy: 'azd'
  'azd-env-name': environmentName
}

// User-assigned identity (not system-assigned) so the same principal can be
// referenced by both the ACR pull role assignment and the container app's
// managedIdentities block without a chicken-and-egg dependency on the app
// existing first.
module identity 'br/public:avm/res/managed-identity/user-assigned-identity:0.6.0' = {
  name: 'identity-deployment'
  params: {
    name: managedIdentityName
    location: location
    tags: tags
  }
}

// Admin user stays off (AVM default). Pull auth is via the user-assigned
// identity's AcrPull role assignment below, not registry credentials, per
// the no-secrets rule in .claude/rules/secrets-security.md.
module containerRegistry 'br/public:avm/res/container-registry/registry:0.12.1' = {
  name: 'registry-deployment'
  params: {
    name: containerRegistryName
    location: location
    tags: tags
    acrSku: 'Basic'
    acrAdminUserEnabled: false
    roleAssignments: [
      {
        principalId: identity.outputs.principalId
        roleDefinitionIdOrName: 'AcrPull'
        principalType: 'ServicePrincipal'
      }
    ]
  }
}

// zoneRedundant is explicitly false: the AVM default is true, which forces
// infrastructureSubnetResourceId + CIDR params (a VNet this teaching demo has
// no reason to provision). No Log Analytics workspace is wired in either;
// appLogsConfiguration is optional on this module and there is no
// observability requirement here beyond `az containerapp logs show`.
module containerAppsEnvironment 'br/public:avm/res/app/managed-environment:0.14.0' = {
  name: 'containerapps-env-deployment'
  params: {
    name: containerAppsEnvName
    location: location
    tags: tags
    zoneRedundant: false
    publicNetworkAccess: 'Enabled'
  }
}

module containerApp 'br/public:avm/res/app/container-app:0.23.0' = {
  name: 'containerapp-deployment'
  params: {
    name: containerAppName
    location: location
    tags: union(tags, {
      'azd-service-name': 'documentmcp-server'
    })
    environmentResourceId: containerAppsEnvironment.outputs.resourceId
    managedIdentities: {
      userAssignedResourceIds: [
        identity.outputs.resourceId
      ]
    }
    registries: [
      {
        server: containerRegistry.outputs.loginServer
        identity: identity.outputs.resourceId
      }
    ]
    ingressExternal: true
    ingressTargetPort: 8000
    ingressTransport: 'http'
    ingressAllowInsecure: false
    scaleSettings: {
      minReplicas: 0
      maxReplicas: 3
    }
    containers: [
      {
        name: 'documentmcp-server'
        image: containerImage
        resources: {
          cpu: '0.5'
          memory: '1Gi'
        }
        env: [
          {
            name: 'FASTMCP_HOST'
            value: '0.0.0.0'
          }
          {
            name: 'FASTMCP_PORT'
            value: '8000'
          }
        ]
      }
    ]
  }
}

@description('The FQDN of the deployed Container App. Append /mcp for the Streamable HTTP endpoint.')
output containerAppFqdn string = containerApp.outputs.fqdn

@description('Resource ID of the Container App. Used by azd to resolve the azd-service-name tag.')
output containerAppResourceId string = containerApp.outputs.resourceId

@description('Login server of the Container Registry azd builds and pushes images to.')
output containerRegistryLoginServer string = containerRegistry.outputs.loginServer

@description('Name of the Container Registry. Used by azd for image push targeting.')
output containerRegistryName string = containerRegistry.outputs.name

@description('Client ID of the user-assigned managed identity. No secrets are output; there are none to output.')
output managedIdentityClientId string = identity.outputs.clientId
