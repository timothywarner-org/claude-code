using 'main.bicep'

// azd injects AZURE_ENV_NAME at provision time; the literal here is the
// local/manual `az deployment group create` fallback for anyone not using azd.
param environmentName = readEnvironmentVariable('AZURE_ENV_NAME', 'documentmcp-dev')
param location = readEnvironmentVariable('AZURE_LOCATION', 'eastus2')
