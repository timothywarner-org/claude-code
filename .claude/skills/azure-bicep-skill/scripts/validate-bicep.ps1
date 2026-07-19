#Requires -Version 7.0

<#
.SYNOPSIS
    Validates a Bicep deployment against Microsoft proven-practice gates before deploy.

.DESCRIPTION
    Runs the four pre-deploy checks the azure-bicep-skill prescribes:

      1. bicep build      - Syntax + transpile check
      2. bicep lint       - Style rules from bicepconfig.json
      3. AVM version pin  - Static scan for unpinned br/public:avm/* module references
      4. az what-if       - Deployment diff against the live tenant

    Exits non-zero on any failure so it slots cleanly into a CI gate (GitHub Actions,
    Azure DevOps, pre-commit hook). Each gate can be skipped individually for fast
    iteration during authoring.

    Why this exists: every Bicep author re-invents the same wrapper that chains build,
    lint, and what-if. The azure-bicep-skill SKILL.md describes the gates; this script
    runs them. One source of truth for the proven-practice validation pipeline.

.PARAMETER TemplateFile
    Path to the Bicep entry-point template (typically main.bicep).

.PARAMETER ParametersFile
    Path to the .bicepparam parameter file. Optional - omit for templates without params.

.PARAMETER Scope
    Deployment scope for what-if. One of: resourceGroup, subscription, managementGroup, tenant.
    Defaults to resourceGroup. Must match the targetScope declared in the template.

.PARAMETER Location
    Azure region for subscription/management-group/tenant-scope deployments. Required
    for those scopes; ignored for resourceGroup scope.

.PARAMETER ResourceGroupName
    Target resource group for resourceGroup-scope deployments. Required for that scope.

.PARAMETER SkipBuild
    Skip the bicep build gate. Useful when iterating on parameter files only.

.PARAMETER SkipLint
    Skip the bicep lint gate.

.PARAMETER SkipAvmCheck
    Skip the AVM version-pin scan.

.PARAMETER SkipWhatIf
    Skip the az deployment what-if gate. Use during local authoring when you do not
    want to hit the live tenant. Never skip in CI.

.EXAMPLE
    ./validate-bicep.ps1 -TemplateFile main.bicep -ParametersFile main.bicepparam -Scope subscription -Location eastus2

    Full validation run for a subscription-scope landing zone deployment.

.EXAMPLE
    ./validate-bicep.ps1 -TemplateFile main.bicep -ResourceGroupName rg-app-prod-eastus2 -SkipWhatIf

    Local authoring loop: build + lint + AVM scan, no tenant call.

.NOTES
    Part of the azure-bicep-skill (C:\github\claude-code\.claude\skills\azure-bicep-skill).
    Requires: bicep CLI, az CLI, PowerShell 7+.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateScript({ Test-Path $_ -PathType Leaf })]
    [string]$TemplateFile,

    [Parameter()]
    [ValidateScript({ Test-Path $_ -PathType Leaf })]
    [string]$ParametersFile,

    [Parameter()]
    [ValidateSet('resourceGroup', 'subscription', 'managementGroup', 'tenant')]
    [string]$Scope = 'resourceGroup',

    [Parameter()]
    [string]$Location,

    [Parameter()]
    [string]$ResourceGroupName,

    [switch]$SkipBuild,
    [switch]$SkipLint,
    [switch]$SkipAvmCheck,
    [switch]$SkipWhatIf
)

$ErrorActionPreference = 'Stop'

# Track gate results so we can print a final report and exit with the correct code.
# A hashtable preserves insertion order in PS7 and keeps the report readable.
$results = [ordered]@{}

function Write-GateHeader {
    param([string]$Name)
    Write-Host ""
    Write-Host "===== Gate: $Name =====" -ForegroundColor Cyan
}

function Set-GateResult {
    param(
        [string]$Name,
        [ValidateSet('PASS', 'FAIL', 'SKIP')]
        [string]$Status,
        [string]$Detail = ''
    )
    $results[$Name] = @{ Status = $Status; Detail = $Detail }
}

# Gate 1: bicep build
# Syntax + transpile check. Catches typos, bad references, missing braces before
# you ever hit the tenant. Cheapest gate, runs first.
if ($SkipBuild) {
    Set-GateResult -Name 'bicep build' -Status 'SKIP'
}
else {
    Write-GateHeader 'bicep build'
    try {
        bicep build $TemplateFile --stdout | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "bicep build returned exit code $LASTEXITCODE" }
        Set-GateResult -Name 'bicep build' -Status 'PASS'
        Write-Host "OK" -ForegroundColor Green
    }
    catch {
        Set-GateResult -Name 'bicep build' -Status 'FAIL' -Detail $_.Exception.Message
        Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Gate 2: bicep lint
# Style + best-practice rules from bicepconfig.json. The 'core' ruleset catches
# the most common foot-guns (no-unused-params, prefer-interpolation, etc.).
if ($SkipLint) {
    Set-GateResult -Name 'bicep lint' -Status 'SKIP'
}
else {
    Write-GateHeader 'bicep lint'
    try {
        bicep lint $TemplateFile
        if ($LASTEXITCODE -ne 0) { throw "bicep lint returned exit code $LASTEXITCODE" }
        Set-GateResult -Name 'bicep lint' -Status 'PASS'
        Write-Host "OK" -ForegroundColor Green
    }
    catch {
        Set-GateResult -Name 'bicep lint' -Status 'FAIL' -Detail $_.Exception.Message
        Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Gate 3: AVM version-pin scan
# AVM modules MUST be pinned to a specific version. Floating versions break
# reproducibility and let a registry update silently change your deployment.
# We grep for br/public:avm/ references and flag any missing the :<version> suffix.
if ($SkipAvmCheck) {
    Set-GateResult -Name 'AVM version pin' -Status 'SKIP'
}
else {
    Write-GateHeader 'AVM version pin'
    try {
        $templateDir = Split-Path -Parent (Resolve-Path $TemplateFile)
        $bicepFiles = Get-ChildItem -Path $templateDir -Filter *.bicep -Recurse -File

        # Match: 'br/public:avm/...' inside a module declaration's source string.
        # A valid reference must end with :<version> before the closing quote.
        $avmRefPattern = "br/public:avm/[^'`":]+(?::([^'`"\s]+))?"

        $unpinned = @()
        foreach ($file in $bicepFiles) {
            $lineNo = 0
            foreach ($line in Get-Content -LiteralPath $file.FullName) {
                $lineNo++
                $matches = [regex]::Matches($line, $avmRefPattern)
                foreach ($m in $matches) {
                    $version = $m.Groups[1].Value
                    if ([string]::IsNullOrWhiteSpace($version)) {
                        $unpinned += [pscustomobject]@{
                            File = $file.FullName.Replace($templateDir + [IO.Path]::DirectorySeparatorChar, '')
                            Line = $lineNo
                            Reference = $m.Value
                        }
                    }
                }
            }
        }

        if ($unpinned.Count -eq 0) {
            Set-GateResult -Name 'AVM version pin' -Status 'PASS'
            Write-Host "OK - all AVM module references are version-pinned" -ForegroundColor Green
        }
        else {
            $detail = "$($unpinned.Count) unpinned AVM reference(s) found"
            Set-GateResult -Name 'AVM version pin' -Status 'FAIL' -Detail $detail
            Write-Host "FAIL: $detail" -ForegroundColor Red
            $unpinned | Format-Table -AutoSize | Out-String | Write-Host
        }
    }
    catch {
        Set-GateResult -Name 'AVM version pin' -Status 'FAIL' -Detail $_.Exception.Message
        Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Gate 4: az deployment what-if
# The closest thing Bicep has to a dry-run. Shows every Create / Modify / Delete /
# Ignore action ARM would take. Read every Modify and Delete line carefully -
# this is where you catch accidental destructive changes before they happen.
if ($SkipWhatIf) {
    Set-GateResult -Name 'az what-if' -Status 'SKIP'
}
else {
    Write-GateHeader 'az what-if'
    try {
        $whatIfArgs = @('deployment', $Scope, 'what-if', '--template-file', $TemplateFile)

        if ($ParametersFile) {
            $whatIfArgs += @('--parameters', $ParametersFile)
        }

        switch ($Scope) {
            'resourceGroup' {
                if (-not $ResourceGroupName) {
                    throw 'ResourceGroupName is required for resourceGroup-scope deployments.'
                }
                $whatIfArgs += @('--resource-group', $ResourceGroupName)
            }
            { $_ -in 'subscription', 'managementGroup', 'tenant' } {
                if (-not $Location) {
                    throw "Location is required for $_-scope deployments."
                }
                $whatIfArgs += @('--location', $Location)
            }
        }

        az @whatIfArgs
        if ($LASTEXITCODE -ne 0) { throw "az what-if returned exit code $LASTEXITCODE" }

        Set-GateResult -Name 'az what-if' -Status 'PASS'
        Write-Host "OK - review the diff above before deploying" -ForegroundColor Green
    }
    catch {
        Set-GateResult -Name 'az what-if' -Status 'FAIL' -Detail $_.Exception.Message
        Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Final report
Write-Host ""
Write-Host "===== Validation Summary =====" -ForegroundColor Cyan
$report = $results.GetEnumerator() | ForEach-Object {
    [pscustomobject]@{
        Gate   = $_.Key
        Status = $_.Value.Status
        Detail = $_.Value.Detail
    }
}
$report | Format-Table -AutoSize | Out-String | Write-Host

$failed = @($results.GetEnumerator() | Where-Object { $_.Value.Status -eq 'FAIL' })
if ($failed.Count -gt 0) {
    Write-Host "$($failed.Count) gate(s) failed. Deployment blocked." -ForegroundColor Red
    exit 1
}
else {
    Write-Host "All active gates passed. Safe to deploy." -ForegroundColor Green
    exit 0
}
