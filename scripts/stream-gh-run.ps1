<#
.SYNOPSIS
  Poll GitHub Actions run logs until available, save locally, optionally rerun the workflow.

.DESCRIPTION
  Uses the GitHub CLI (gh). Auth must already be configured (gh auth login). Detects repo from git remote if possible.
#>
param(
  [string]$Repo = "",
  [string]$RunId = "",
  [string]$OutDir = "$env:USERPROFILE\Downloads\gh-run-logs",
  [int]$RetryIntervalSeconds = 5,
  [int]$MaxAttempts = 36,
  [switch]$AutoRerun
)

function Fail($msg) { Write-Host $msg -ForegroundColor Red; exit 1 }

# Check gh installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Fail "gh CLI not found. Install from https://cli.github.com/ and run 'gh auth login' in the terminal."
}

# Try auto-detect repo from git remote
if (-not $Repo -or $Repo -eq "") {
  try {
    $remote = git remote get-url origin 2>$null
    if ($remote) {
      # remote can be: git@github.com:owner/repo.git or https://github.com/owner/repo.git
      if ($remote -match "github.com[:\/\\]([^\/]+)\/(.+?)(\.git)?$") {
        $owner = $matches[1]
        $repoName = $matches[2]
        $Repo = "$owner/$repoName"
        Write-Host "Detected repo: $Repo"
      }
    }
  } catch { }
}

# If still no repo, prompt
if (-not $Repo -or $Repo -eq "") {
  $Repo = Read-Host "Enter repo (owner/repo) (e.g. jrdbacosta/MinersWar)"
  if (-not $Repo) { Fail "Repository is required." }
}

# Check gh auth
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0 -or $authStatus -match "not logged in") {
  Write-Host $authStatus
  Fail "You are not logged in with gh. Run 'gh auth login' in the terminal and try again."
}

# Prompt for run id (allow empty -> use latest)
if (-not $RunId -or $RunId -eq "") {
  $input = Read-Host "Enter run ID (leave blank to use latest run)"
  if ($input -and $input.Trim() -ne "") {
    $RunId = $input.Trim()
  } else {
    Write-Host "Fetching latest run id for $Repo..."
    $json = gh run list --repo $Repo --limit 1 --json id,status,conclusion 2>&1
    if ($LASTEXITCODE -ne 0) {
      Write-Host $json
      Fail "Failed to get latest run. Provide a run ID manually."
    }
    try {
      $arr = $json | ConvertFrom-Json
      if ($arr -and $arr.Count -ge 1) {
        $RunId = $arr[0].id
        Write-Host "Using latest run id: $RunId (status: $($arr[0].status), conclusion: $($arr[0].conclusion))"
      } else {
        Fail "No runs found for this repo. Provide a run ID."
      }
    } catch {
      Fail "Could not parse gh run list output. Provide a run ID."
    }
  }
}

# Ensure OutDir exists
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

$outFile = Join-Path $OutDir ("run-" + $RunId + "-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")

Write-Host "Polling logs for run $RunId in $Repo..."
$attempt = 0
while ($attempt -lt $MaxAttempts) {
  $attempt++
  Write-Host ("Attempt {0}/{1}..." -f $attempt, $MaxAttempts)
  # Try to fetch logs to stdout
  $output = gh run view $RunId --repo $Repo --log 2>&1
  $exit = $LASTEXITCODE
  if ($exit -eq 0) {
    # Save output
    $output | Out-File -FilePath $outFile -Encoding utf8
    Write-Host "Logs saved to: $outFile" -ForegroundColor Green
    # try to open the file with the default editor
    try {
      Start-Process -FilePath $outFile
    } catch {
      Write-Host "Could not open the log file automatically. Open it at: $outFile"
    }
    exit 0
  } else {
    $combined = $output -join "`n"
    if ($combined -match "log not found") {
      Write-Host "Logs not found yet; waiting $RetryIntervalSeconds seconds before retrying..."
      Start-Sleep -Seconds $RetryIntervalSeconds
      continue
    } else {
      # Unexpected error: print and break
      Write-Host $combined
      Fail "gh returned an unexpected response. Aborting."
    }
  }
}

# If we get here then attempts exhausted
Write-Host "Exceeded $MaxAttempts attempts and logs are still not available." -ForegroundColor Yellow

if ($AutoRerun.IsPresent) {
  $ans = Read-Host "Do you want to rerun the workflow now? (y/N)"
  if ($ans -match '^[Yy]') {
    Write-Host "Triggering rerun..."
    $rerunOut = gh run rerun $RunId --repo $Repo 2>&1
    if ($LASTEXITCODE -ne 0) {
      Write-Host $rerunOut
      Fail "Failed to trigger rerun."
    } else {
      # try to find URL with new run id
      $lines = $rerunOut -join "`n"
      if ($lines -match "https?://github.com/[^/]+/[^/]+/actions/runs/([0-9]+)") {
        $newId = $matches[1]
        Write-Host "Rerun started. New run id: $newId"
        Write-Host "You can run this tool again with run id $newId, or use 'gh run watch $newId --repo $Repo' to follow logs."
      } else {
        Write-Host "Rerun started. Output:"
        Write-Host $lines
      }
      exit 0
    }
  } else {
    Write-Host "Rerun canceled."
    exit 1
  }
} else {
  Write-Host "To rerun manually: gh run rerun $RunId --repo $Repo" -ForegroundColor Cyan
  Write-Host "Or use 'gh run watch $RunId --repo $Repo' to follow as jobs finish."
  exit 1
}
