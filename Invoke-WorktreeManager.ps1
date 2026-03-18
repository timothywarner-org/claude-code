<#
.SYNOPSIS
    Interactive git worktree manager for parallel Claude Code sessions.

.DESCRIPTION
    A console menu tool that simplifies creating, managing, and merging git
    worktrees so you can run two (or more) Claude Code sessions side by side
    in separate VS Code windows.

    Workflow:
      1. cd to your project root
      2. Run this script -- it validates the repo and shows the menu
      3. Create a worktree (option 1) -- a sibling directory is created
      4. Open both directories in VS Code with Claude Code
      5. When finished, return here to merge and clean up

    Worktrees are created as sibling directories:
      C:\github\my-project\                  <-- main repo (you are here)
      C:\github\my-project-worktrees\feat\   <-- worktree checkout

    Educational tips appear in cyan at each step so you learn what git
    is actually doing under the hood.

.PARAMETER NonInteractive
    Skip the menu loop and perform a single action via -Action.

.PARAMETER Action
    Used with -NonInteractive. One of: Create, List, Merge, Remove.

.PARAMETER WorktreeName
    Branch/worktree name to use (skips the name prompt).

.EXAMPLE
    .\Invoke-WorktreeManager.ps1
    Launches the interactive menu.

.EXAMPLE
    .\Invoke-WorktreeManager.ps1 -NonInteractive -Action Create -WorktreeName "feat-auth"
    Creates a worktree non-interactively.

.NOTES
    Author  : Tim Warner
    Requires: PowerShell 7+, git 2.20+
    Platform: Windows 11 (works on any OS with pwsh + git)
#>

#Requires -Version 7.0

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [switch]$NonInteractive,

    [Parameter(Mandatory = $false)]
    [ValidateSet("Create", "List", "Merge", "Remove")]
    [string]$Action,

    [Parameter(Mandatory = $false)]
    [string]$WorktreeName
)

$ErrorActionPreference = "Stop"

#region Helper Functions -- Console Output

function Write-Tip {
    <#
    .SYNOPSIS
        Prints a one-line educational tip in cyan.
    #>
    param([string]$Message)
    Write-Host "[Learn] " -ForegroundColor DarkCyan -NoNewline
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "[..] $Message" -ForegroundColor Gray
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[!!] $Message" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Message)
    Write-Host "[XX] $Message" -ForegroundColor Red
}

function Write-Banner {
    param([string]$Title)
    $bar = "=" * 60
    Write-Host ""
    Write-Host $bar -ForegroundColor DarkYellow
    Write-Host "  $Title" -ForegroundColor Yellow
    Write-Host $bar -ForegroundColor DarkYellow
    Write-Host ""
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "--- $Title ---" -ForegroundColor White
    Write-Host ""
}

#endregion

#region Helper Functions -- Git Safety

function Test-GitSuccess {
    <#
    .SYNOPSIS
        Checks $LASTEXITCODE after a git command. Returns $true if 0.
        Native executables do NOT throw in PowerShell 7 -- you must check manually.
    #>
    return $LASTEXITCODE -eq 0
}

function Read-MenuChoice {
    <#
    .SYNOPSIS
        Reads a numeric menu choice from the user. Returns the 0-based index,
        or -1 if the input was invalid.
    #>
    param([string]$Prompt, [int]$Max)
    $raw = Read-Host $Prompt
    $parsed = 0
    if ([int]::TryParse($raw, [ref]$parsed)) {
        $index = $parsed - 1
        if ($index -ge 0 -and $index -lt $Max) {
            return $index
        }
    }
    return -1
}

#endregion

#region Helper Functions -- Git Queries

function Confirm-GitRepo {
    <#
    .SYNOPSIS
        Validates the current directory is a git repo root (not a subdirectory,
        not inside a worktree).  Returns $true or $false.
    #>
    # Is this even a git repo?
    $insideWorkTree = git rev-parse --is-inside-work-tree 2>$null
    if ($insideWorkTree -ne "true") {
        return @{ Valid = $false; Reason = "Not inside a git repository. cd to your project root first." }
    }

    # Are we at the root, not a subdirectory?
    $repoRoot = (git rev-parse --show-toplevel 2>$null) -replace '/', '\'
    $cwd = (Get-Location).Path.TrimEnd('\')
    if ($repoRoot.TrimEnd('\') -ne $cwd) {
        return @{
            Valid  = $false
            Reason = "You are inside the repo but not at the root.`nRepo root : $repoRoot`nYou are in: $cwd`nPlease cd to the repo root."
        }
    }

    # Are we inside an existing worktree (not the main working tree)?
    $mainWorktree = (git worktree list --porcelain 2>$null | Select-String -Pattern "^worktree " | Select-Object -First 1).ToString() -replace '^worktree ', ''
    $mainWorktree = $mainWorktree -replace '/', '\'
    if ($mainWorktree.TrimEnd('\') -ne $cwd) {
        return @{
            Valid  = $false
            Reason = "You are inside a worktree, not the main repo.`nMain repo: $mainWorktree`nRun this script from the main repo instead."
        }
    }

    return @{ Valid = $true; Reason = "" }
}

function Get-RepoInfo {
    <#
    .SYNOPSIS
        Returns a PSCustomObject with repo metadata.
    #>
    $root = (git rev-parse --show-toplevel 2>$null) -replace '/', '\'
    $repoName = Split-Path -Leaf $root
    $branch = git branch --show-current 2>$null
    $parentDir = Split-Path -Parent $root
    $worktreeContainer = Join-Path $parentDir "$repoName-worktrees"

    return [PSCustomObject]@{
        RepoName           = $repoName
        RepoRoot           = $root
        CurrentBranch      = $branch
        WorktreeContainer  = $worktreeContainer
    }
}

function Test-UncommittedChanges {
    <#
    .SYNOPSIS
        Returns $true if the working tree has uncommitted changes.
    #>
    $status = git status --porcelain 2>$null
    return [bool]$status
}

function Get-WorktreeList {
    <#
    .SYNOPSIS
        Parses 'git worktree list --porcelain' into structured objects.
    #>
    $raw = git worktree list --porcelain 2>$null
    if (-not $raw) { return @() }

    $worktrees = @()
    $current = @{}

    foreach ($line in $raw) {
        if ($line -match '^worktree (.+)') {
            if ($current.Count -gt 0) { $worktrees += [PSCustomObject]$current }
            $current = @{
                Path     = $Matches[1] -replace '/', '\'
                Branch   = ""
                Commit   = ""
                IsMain   = $false
                IsBare   = $false
            }
        }
        elseif ($line -match '^HEAD (.+)') {
            $current.Commit = $Matches[1].Substring(0, 7)
        }
        elseif ($line -match '^branch (.+)') {
            $current.Branch = $Matches[1] -replace '^refs/heads/', ''
        }
        elseif ($line -match '^bare') {
            $current.IsBare = $true
        }
    }
    if ($current.Count -gt 0) { $worktrees += [PSCustomObject]$current }

    # Mark the first entry as main
    if ($worktrees.Count -gt 0) {
        $worktrees[0].IsMain = $true
    }

    return $worktrees
}

function Get-BranchAheadBehind {
    <#
    .SYNOPSIS
        Returns ahead/behind counts for a branch relative to the main branch.
    #>
    param([string]$Branch, [string]$MainBranch)
    $counts = git rev-list --left-right --count "$MainBranch...$Branch" 2>$null
    if ($counts -match '(\d+)\s+(\d+)') {
        return @{ Behind = [int]$Matches[1]; Ahead = [int]$Matches[2] }
    }
    return @{ Behind = 0; Ahead = 0 }
}

function Test-BranchExists {
    param([string]$Name)
    $result = git branch --list $Name 2>$null
    return [bool]$result
}

function Get-NonMainWorktrees {
    <#
    .SYNOPSIS
        Returns only the worktrees that are not the main working tree.
    #>
    $all = Get-WorktreeList
    return @($all | Where-Object { -not $_.IsMain })
}

#endregion

#region Core Operations

function New-Worktree {
    <#
    .SYNOPSIS
        Creates a new worktree with a new branch.
    #>
    param([string]$Name)

    Write-Tip "A worktree is a second checkout of your repo -- same .git history, separate working files."
    Write-Tip "Changes in one worktree are invisible to the other until you merge."

    $info = Get-RepoInfo

    # Prompt for name if not supplied
    if (-not $Name) {
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $defaultName = "claude/$timestamp"
        Write-Host ""
        Write-Host "  Enter a branch name for the worktree." -ForegroundColor White
        Write-Host "  Use slashes for grouping (e.g. feat/auth, fix/bug-42)." -ForegroundColor Gray
        Write-Host "  Press Enter to accept the default: " -ForegroundColor Gray -NoNewline
        Write-Host $defaultName -ForegroundColor DarkCyan
        Write-Host ""
        $input = Read-Host "  Branch name"
        $Name = if ($input) { $input } else { $defaultName }
    }

    # Validate branch name: no spaces, no special chars beyond -/_. and alphanumerics
    if ($Name -notmatch '^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$') {
        Write-Err "Invalid branch name '$Name'. Use letters, numbers, hyphens, underscores, dots, and slashes."
        return
    }

    # Check for existing branch
    if (Test-BranchExists $Name) {
        Write-Err "Branch '$Name' already exists. Pick a different name or remove the old branch first."
        return
    }

    # Warn about uncommitted changes (non-blocking)
    if (Test-UncommittedChanges) {
        Write-Warn "You have uncommitted changes in the main working tree."
        Write-Warn "The new worktree will branch from the last COMMIT, not your uncommitted work."
        Write-Host ""
        $proceed = Read-Host "  Continue anyway? (y/N)"
        if ($proceed -notin @("y", "Y", "yes")) {
            Write-Info "Cancelled. Commit or stash your changes first."
            return
        }
    }

    # Build the worktree path -- flatten slashes in branch name for the directory name
    $safeDirName = $Name -replace '/', '--'
    $worktreePath = Join-Path $info.WorktreeContainer $safeDirName

    if (Test-Path $worktreePath) {
        Write-Err "Directory already exists: $worktreePath"
        Write-Err "Remove it or choose a different name."
        return
    }

    # Create container directory if needed
    if (-not (Test-Path $info.WorktreeContainer)) {
        New-Item -ItemType Directory -Path $info.WorktreeContainer -Force | Out-Null
        Write-Info "Created worktree container: $($info.WorktreeContainer)"
    }

    # Create the worktree
    Write-Info "Creating worktree..."
    Write-Tip "Running: git worktree add `"$worktreePath`" -b `"$Name`""

    git worktree add $worktreePath -b $Name 2>&1 | ForEach-Object { Write-Info $_ }
    if (-not (Test-GitSuccess)) {
        Write-Err "git worktree add failed (exit code $LASTEXITCODE). Check output above."
        return
    }

    # Verify the checkout directory exists
    if (-not (Test-Path (Join-Path $worktreePath ".git"))) {
        Write-Err "Worktree directory was not created. Check git output above."
        return
    }

    Write-Host ""
    Write-Success "Worktree created!"
    Write-Host ""
    Write-Host "  Branch : " -NoNewline -ForegroundColor Gray
    Write-Host $Name -ForegroundColor Green
    Write-Host "  Path   : " -NoNewline -ForegroundColor Gray
    Write-Host $worktreePath -ForegroundColor Green
    Write-Host ""

    # Offer to open in VS Code
    Write-Section "Next Steps"
    Write-Host "  Open two VS Code windows:" -ForegroundColor White
    Write-Host ""
    Write-Host "    Window 1 (main)     :  " -ForegroundColor Gray -NoNewline
    Write-Host "code `"$($info.RepoRoot)`"" -ForegroundColor Cyan
    Write-Host "    Window 2 (worktree) :  " -ForegroundColor Gray -NoNewline
    Write-Host "code `"$worktreePath`"" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Then start Claude Code in each window (Ctrl+Shift+P > Claude Code)." -ForegroundColor White
    Write-Host ""

    $openNow = Read-Host "  Open the worktree in VS Code now? (Y/n)"
    if ($openNow -notin @("n", "N", "no")) {
        $codeCmd = Get-Command code -ErrorAction SilentlyContinue
        if ($codeCmd) {
            code $worktreePath
            Write-Success "VS Code launched for the worktree."
        }
        else {
            Write-Warn "'code' command not found in PATH. Open the folder manually in VS Code."
        }
    }
}

function Show-Worktrees {
    <#
    .SYNOPSIS
        Lists all active worktrees with status details.
    #>
    Write-Tip "Worktrees share the same .git database. Each is an independent checkout with its own branch."

    $info = Get-RepoInfo
    $worktrees = Get-WorktreeList

    if ($worktrees.Count -le 1) {
        Write-Info "No extra worktrees found. Only the main working tree exists."
        return
    }

    Write-Host ""
    Write-Host "  #  Branch                    Ahead/Behind  Path" -ForegroundColor DarkGray
    Write-Host "  -  ------                    ------------  ----" -ForegroundColor DarkGray

    $index = 0
    foreach ($wt in $worktrees) {
        $index++
        $marker = if ($wt.IsMain) { "*" } else { " " }
        $label = if ($wt.IsMain) { "(main working tree)" } else { "" }

        $ab = if (-not $wt.IsMain -and $wt.Branch) {
            $counts = Get-BranchAheadBehind -Branch $wt.Branch -MainBranch $info.CurrentBranch
            "+$($counts.Ahead) / -$($counts.Behind)"
        }
        else { "---" }

        $branchDisplay = if ($wt.Branch) { $wt.Branch } else { "(detached)" }
        $color = if ($wt.IsMain) { "Yellow" } else { "White" }

        Write-Host ("  {0}{1}  {2,-25} {3,-13} {4} {5}" -f $marker, $index, $branchDisplay, $ab, $wt.Path, $label) -ForegroundColor $color
    }
    Write-Host ""
}

function Merge-WorktreeBranch {
    <#
    .SYNOPSIS
        Merges a worktree branch back into the current (main) branch.
    #>
    Write-Tip "Merging brings the worktree's changes into your main branch."
    Write-Tip "Squash merge (default) collapses all commits into one -- great for Claude Code sessions."

    $info = Get-RepoInfo
    $extras = Get-NonMainWorktrees

    if ($extras.Count -eq 0) {
        Write-Info "No worktree branches to merge."
        return
    }

    # Check for uncommitted changes in main
    if (Test-UncommittedChanges) {
        Write-Err "You have uncommitted changes in the main working tree."
        Write-Err "Commit or stash them before merging."
        return
    }

    # Let user pick a branch
    Write-Section "Select a worktree branch to merge"
    $index = 0
    foreach ($wt in $extras) {
        $index++
        $counts = Get-BranchAheadBehind -Branch $wt.Branch -MainBranch $info.CurrentBranch
        Write-Host "  [$index] $($wt.Branch)  (+$($counts.Ahead) commits ahead)" -ForegroundColor White
    }
    Write-Host ""
    $choiceIndex = Read-MenuChoice -Prompt "  Select (1-$($extras.Count))" -Max $extras.Count
    if ($choiceIndex -lt 0) {
        Write-Err "Invalid selection. Enter a number between 1 and $($extras.Count)."
        return
    }
    $target = $extras[$choiceIndex]

    # Check if the worktree has uncommitted changes
    $worktreeStatus = git -C $target.Path status --porcelain 2>$null
    if ($worktreeStatus) {
        Write-Err "The worktree at '$($target.Path)' has uncommitted changes."
        Write-Err "Switch to that directory and commit or discard them first."
        return
    }

    # Pick merge strategy
    Write-Section "Merge Strategy"
    Write-Host "  [1] Squash  -- collapse all commits into one (recommended)" -ForegroundColor Green
    Write-Host "  [2] Merge   -- keep full history with merge commit" -ForegroundColor White
    Write-Host "  [3] Rebase  -- replay commits linearly (advanced)" -ForegroundColor White
    Write-Host ""
    $strategy = Read-Host "  Select strategy (1-3, default=1)"
    if (-not $strategy) { $strategy = "1" }

    Write-Host ""

    switch ($strategy) {
        "1" {
            Write-Tip "Squash merge runs: git merge --squash <branch>, then you commit once."
            Write-Info "Squash-merging '$($target.Branch)' into '$($info.CurrentBranch)'..."

            git merge --squash $target.Branch 2>&1 | ForEach-Object { Write-Info $_ }

            # Check for conflicts (git exits non-zero on conflict)
            $conflictFiles = git diff --name-only --diff-filter=U 2>$null
            if ($conflictFiles -or -not (Test-GitSuccess)) {
                if ($conflictFiles) {
                    Write-Err "Merge conflicts detected in:"
                    $conflictFiles | ForEach-Object { Write-Err "  $_" }
                }
                else {
                    Write-Err "Squash merge failed (exit code $LASTEXITCODE)."
                }
                Write-Host ""
                Write-Warn "Resolve conflicts in your editor, then run:"
                Write-Host "    git add ." -ForegroundColor Cyan
                Write-Host "    git commit" -ForegroundColor Cyan
                Write-Host ""
                Write-Warn "Or abort with:"
                Write-Host "    git merge --abort" -ForegroundColor Cyan
                return
            }

            # Commit the squash
            Write-Host ""
            $defaultMsg = "feat: merge worktree '$($target.Branch)' (squash)"
            Write-Host "  Commit message (Enter to accept default):" -ForegroundColor Gray
            Write-Host "  Default: $defaultMsg" -ForegroundColor DarkCyan
            $commitMsg = Read-Host "  Message"
            if (-not $commitMsg) { $commitMsg = $defaultMsg }

            git commit -m $commitMsg 2>&1 | ForEach-Object { Write-Info $_ }
            if (-not (Test-GitSuccess)) {
                Write-Err "Commit failed (exit code $LASTEXITCODE). Check output above."
                Write-Warn "You may need to resolve issues and run 'git commit' manually."
                return
            }
            Write-Success "Squash merge complete! All worktree commits are now one commit on '$($info.CurrentBranch)'."
        }
        "2" {
            Write-Tip "Regular merge runs: git merge --no-ff <branch> -- preserves full commit history."
            Write-Info "Merging '$($target.Branch)' into '$($info.CurrentBranch)'..."

            git merge --no-ff $target.Branch -m "Merge worktree branch '$($target.Branch)'" 2>&1 | ForEach-Object { Write-Info $_ }

            $conflictFiles = git diff --name-only --diff-filter=U 2>$null
            if ($conflictFiles -or -not (Test-GitSuccess)) {
                if ($conflictFiles) {
                    Write-Err "Merge conflicts detected in:"
                    $conflictFiles | ForEach-Object { Write-Err "  $_" }
                }
                else {
                    Write-Err "Merge failed (exit code $LASTEXITCODE)."
                }
                Write-Host ""
                Write-Warn "Resolve conflicts, then: git add . && git commit"
                Write-Warn "Or abort: git merge --abort"
                return
            }

            Write-Success "Merge complete with full history preserved."
        }
        "3" {
            Write-Tip "Rebase replays worktree commits on top of the current branch -- linear history, but rewrites commits."
            Write-Warn "Rebase rewrites commit hashes. Only use this if you haven't pushed the worktree branch."
            Write-Host ""
            $confirm = Read-Host "  Proceed with rebase? (y/N)"
            if ($confirm -notin @("y", "Y", "yes")) {
                Write-Info "Cancelled."
                return
            }
            Write-Info "Rebasing '$($target.Branch)' onto '$($info.CurrentBranch)'..."
            Write-Tip "Running: git rebase --onto $($info.CurrentBranch) $($info.CurrentBranch) $($target.Branch)"

            # Rebase the worktree branch's commits onto the current branch
            git rebase --onto $info.CurrentBranch $info.CurrentBranch $target.Branch 2>&1 | ForEach-Object { Write-Info $_ }
            if (-not (Test-GitSuccess)) {
                Write-Err "Rebase hit conflicts (exit code $LASTEXITCODE)."
                Write-Warn "Resolve them, then: git rebase --continue"
                Write-Warn "Or abort: git rebase --abort"
                return
            }

            # Fast-forward the current branch to include the rebased commits
            git checkout $info.CurrentBranch 2>&1 | ForEach-Object { Write-Info $_ }
            git merge --ff-only $target.Branch 2>&1 | ForEach-Object { Write-Info $_ }
            if (-not (Test-GitSuccess)) {
                Write-Err "Fast-forward merge failed after rebase (exit code $LASTEXITCODE)."
                return
            }
            Write-Success "Rebase complete. Commits replayed linearly onto '$($info.CurrentBranch)'."
        }
        default {
            Write-Err "Invalid selection."
            return
        }
    }

    # Offer cleanup
    Write-Host ""
    $cleanup = Read-Host "  Remove the worktree and branch now? (Y/n)"
    if ($cleanup -notin @("n", "N", "no")) {
        Remove-WorktreeByObject -Worktree $target
    }
}

function Remove-WorktreeByObject {
    <#
    .SYNOPSIS
        Removes a worktree and optionally its branch. Accepts a worktree object.
    #>
    param([PSCustomObject]$Worktree)

    Write-Tip "Removing a worktree deletes the checkout directory. The branch remains until you delete it too."

    # Remove the worktree directory
    Write-Info "Removing worktree at '$($Worktree.Path)'..."
    git worktree remove $Worktree.Path --force 2>&1 | ForEach-Object { Write-Info $_ }

    if (Test-GitSuccess) {
        Write-Success "Worktree directory removed."
    }
    else {
        Write-Warn "Could not remove worktree cleanly (exit code $LASTEXITCODE)."
        Write-Info "Pruning stale worktree entries..."
        git worktree prune 2>&1 | ForEach-Object { Write-Info $_ }

        # Check if the directory is still locked
        if (Test-Path $Worktree.Path) {
            Write-Warn "Directory still exists. It may be locked by VS Code or another process."
            Write-Warn "Close any editors using this folder, then delete it manually:"
            Write-Host "    Remove-Item -Recurse -Force `"$($Worktree.Path)`"" -ForegroundColor Cyan
        }
    }

    # Delete the branch
    if ($Worktree.Branch) {
        # Check if branch is merged by comparing against the --merged list
        $mergedBranches = git branch --merged 2>$null | ForEach-Object { $_.Trim().TrimStart('* ') }
        $isMerged = $Worktree.Branch -in $mergedBranches

        if ($isMerged) {
            git branch -d $Worktree.Branch 2>&1 | ForEach-Object { Write-Info $_ }
            Write-Success "Branch '$($Worktree.Branch)' deleted (was fully merged)."
        }
        else {
            Write-Warn "Branch '$($Worktree.Branch)' has unmerged commits."
            $forceDelete = Read-Host "  Force-delete the branch and lose those commits? (y/N)"
            if ($forceDelete -in @("y", "Y", "yes")) {
                git branch -D $Worktree.Branch 2>&1 | ForEach-Object { Write-Info $_ }
                Write-Success "Branch '$($Worktree.Branch)' force-deleted."
            }
            else {
                Write-Info "Branch kept. You can delete it later: git branch -D $($Worktree.Branch)"
            }
        }
    }
}

function Remove-Worktree {
    <#
    .SYNOPSIS
        Interactive worktree removal -- user selects which worktree to remove.
    #>
    $extras = Get-NonMainWorktrees

    if ($extras.Count -eq 0) {
        Write-Info "No extra worktrees to remove."
        return
    }

    Write-Section "Select a worktree to remove"
    $index = 0
    foreach ($wt in $extras) {
        $index++
        Write-Host "  [$index] $($wt.Branch)  ($($wt.Path))" -ForegroundColor White
    }
    Write-Host ""
    $choiceIndex = Read-MenuChoice -Prompt "  Select (1-$($extras.Count))" -Max $extras.Count
    if ($choiceIndex -lt 0) {
        Write-Err "Invalid selection. Enter a number between 1 and $($extras.Count)."
        return
    }

    $target = $extras[$choiceIndex]

    # Confirm
    Write-Host ""
    Write-Warn "This will delete the worktree directory and branch '$($target.Branch)'."
    $confirm = Read-Host "  Are you sure? (y/N)"
    if ($confirm -notin @("y", "Y", "yes")) {
        Write-Info "Cancelled."
        return
    }

    Remove-WorktreeByObject -Worktree $target
}

function Open-WorktreeInVSCode {
    <#
    .SYNOPSIS
        Opens a worktree directory in VS Code.
    #>
    $extras = Get-NonMainWorktrees

    if ($extras.Count -eq 0) {
        Write-Info "No extra worktrees to open."
        return
    }

    Write-Section "Select a worktree to open in VS Code"
    $index = 0
    foreach ($wt in $extras) {
        $index++
        Write-Host "  [$index] $($wt.Branch)  ($($wt.Path))" -ForegroundColor White
    }
    Write-Host ""
    $choiceIndex = Read-MenuChoice -Prompt "  Select (1-$($extras.Count))" -Max $extras.Count
    if ($choiceIndex -lt 0) {
        Write-Err "Invalid selection. Enter a number between 1 and $($extras.Count)."
        return
    }

    $target = $extras[$choiceIndex]
    $codeCmd = Get-Command code -ErrorAction SilentlyContinue
    if ($codeCmd) {
        code $target.Path
        Write-Success "VS Code launched for '$($target.Branch)' at $($target.Path)"
    }
    else {
        Write-Warn "'code' command not found in PATH."
        Write-Info "Open this folder manually: $($target.Path)"
    }
}

#endregion

#region Interactive Menu

function Show-Menu {
    <#
    .SYNOPSIS
        Renders the main menu and returns the user's choice.
    #>
    $info = Get-RepoInfo
    $extras = Get-NonMainWorktrees
    $wtCount = $extras.Count

    Write-Host ""
    Write-Host "==========================================" -ForegroundColor DarkYellow
    Write-Host "  Claude Worktree Manager" -ForegroundColor Yellow
    Write-Host "==========================================" -ForegroundColor DarkYellow
    Write-Host "  Repo   : " -ForegroundColor Gray -NoNewline
    Write-Host "$($info.RepoName)" -ForegroundColor White -NoNewline
    Write-Host " ($($info.CurrentBranch))" -ForegroundColor DarkGray
    Write-Host "  Active : " -ForegroundColor Gray -NoNewline
    $wtColor = if ($wtCount -gt 0) { "Green" } else { "DarkGray" }
    Write-Host "$wtCount worktree(s)" -ForegroundColor $wtColor
    Write-Host "==========================================" -ForegroundColor DarkYellow
    Write-Host ""
    Write-Host "  [1] Create new worktree" -ForegroundColor White
    Write-Host "  [2] List worktrees" -ForegroundColor White
    Write-Host "  [3] Merge worktree branch" -ForegroundColor White
    Write-Host "  [4] Remove worktree" -ForegroundColor White
    Write-Host "  [5] Open worktree in VS Code" -ForegroundColor White
    Write-Host ""
    Write-Host "  [Q] Quit" -ForegroundColor DarkGray
    Write-Host ""

    return Read-Host "  Select"
}

#endregion

#region Main Entry Point

# Prune stale worktree entries on startup
git worktree prune 2>$null

# Validate we are in a git repo root
$validation = Confirm-GitRepo
if (-not $validation.Valid) {
    Write-Banner "Claude Worktree Manager"
    Write-Err $validation.Reason
    Write-Host ""
    Write-Tip "A git worktree is a linked checkout of your repo. You need to be at the root of a git repository to use this tool."
    Write-Host ""
    exit 1
}

# Non-interactive mode
if ($NonInteractive) {
    if (-not $Action) {
        Write-Err "Specify -Action (Create, List, Merge, Remove) when using -NonInteractive."
        exit 1
    }
    switch ($Action) {
        "Create" { New-Worktree -Name $WorktreeName }
        "List"   { Show-Worktrees }
        "Merge"  { Merge-WorktreeBranch }
        "Remove" { Remove-Worktree }
    }
    exit 0
}

# Interactive menu loop
Write-Banner "Claude Worktree Manager"
Write-Tip "This tool helps you run parallel Claude Code sessions using git worktrees."
Write-Tip "Each worktree is a full checkout sharing the same repo history."

while ($true) {
    $choice = Show-Menu

    switch ($choice) {
        "1" { New-Worktree -Name $WorktreeName }
        "2" { Show-Worktrees }
        "3" { Merge-WorktreeBranch }
        "4" { Remove-Worktree }
        "5" { Open-WorktreeInVSCode }
        { $_ -in @("q", "Q") } {
            Write-Host ""
            Write-Info "Goodbye! Remember to merge or clean up any open worktrees."
            Write-Host ""
            exit 0
        }
        default {
            Write-Warn "Invalid choice. Enter 1-5 or Q."
        }
    }
}

#endregion
