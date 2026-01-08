#!/usr/bin/env bash
# Poll GitHub Actions run logs until available, save locally, optionally rerun the workflow.
# Usage examples:
#   ./gh-stream-macos.sh                       # prompts for repo/run (tries to detect repo)
#   ./gh-stream-macos.sh --repo owner/repo     # prompt for run id (Enter = latest)
#   ./gh-stream-macos.sh --run 12345 --repo owner/repo --auto-rerun --non-interactive

set -euo pipefail

# Defaults
OUTDIR="${HOME}/Downloads/gh-run-logs"
REPO=""
RUNID=""
RETRY_INTERVAL=5
MAX_ATTEMPTS=36
AUTO_RERUN=false
NON_INTERACTIVE=false

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]
Options:
  --repo owner/repo         Repository (owner/repo). If omitted, script attempts to detect from git origin.
  --run ID                  Run id. If omitted, will use latest run.
  --outdir PATH             Where to save logs (default: $OUTDIR)
  --interval SECONDS        Poll interval (default: $RETRY_INTERVAL)
  --attempts N              Max poll attempts (default: $MAX_ATTEMPTS)
  --auto-rerun              If logs never appear, offer to rerun (or auto when --non-interactive)
  --non-interactive         Don't prompt; fail/auto-run as flags indicate
  -h, --help
EOF
  exit 1
}

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO="$2"; shift 2;;
    --run) RUNID="$2"; shift 2;;
    --outdir) OUTDIR="$2"; shift 2;;
    --interval) RETRY_INTERVAL="$2"; shift 2;;
    --attempts) MAX_ATTEMPTS="$2"; shift 2;;
    --auto-rerun) AUTO_RERUN=true; shift ;;
    --non-interactive) NON_INTERACTIVE=true; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1"; usage ;;
  esac
done

die() { echo "ERROR: $*" >&2; exit 1; }

# Check gh CLI
if ! command -v gh >/dev/null 2>&1; then
  die "gh CLI not found. Install from https://cli.github.com/ and run 'gh auth login'."
fi

# Try detect repo from git remote
if [[ -z "$REPO" ]]; then
  if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    remote_url=$(git remote get-url origin 2>/dev/null || true)
    if [[ -n "$remote_url" ]]; then
      # github.com:owner/repo.git or https://github.com/owner/repo.git
      if [[ "$remote_url" =~ github.com[:/]+([^/]+)/([^/.]+)(\.git)?$ ]]; then
        owner="${BASH_REMATCH[1]}"
        repoName="${BASH_REMATCH[2]}"
        REPO="${owner}/${repoName}"
        echo "Detected repo: $REPO"
      fi
    fi
  fi
fi

# If still not set, prompt (unless non-interactive)
if [[ -z "$REPO" ]]; then
  if [[ "$NON_INTERACTIVE" == "true" ]]; then
    die "Repository not specified and could not be detected. Use --repo in non-interactive mode."
  fi
  read -rp "Enter repo (owner/repo) (e.g. jrdbacosta/MinersWar): " REPO
  [[ -n "$REPO" ]] || die "Repository is required."
fi

# Validate gh auth
if ! gh auth status >/dev/null 2>&1; then
  die "gh not authenticated. Run 'gh auth login' in your terminal and try again."
fi

# If RUNID empty, prompt or fetch latest
if [[ -z "$RUNID" ]]; then
  if [[ "$NON_INTERACTIVE" == "true" ]]; then
    echo "Fetching latest run id for $REPO..."
    # Attempt to use gh --jq to get the id; fallback to python parsing
    if gh run list --repo "$REPO" --limit 1 --json id --jq '.[0].id' >/dev/null 2>&1; then
      RUNID=$(gh run list --repo "$REPO" --limit 1 --json id --jq '.[0].id')
    else
      json=$(gh run list --repo "$REPO" --limit 1 --json id 2>/dev/null) || die "Failed to list runs for $REPO"
      RUNID=$(printf '%s' "$json" | python3 -c "import sys, json; arr=json.load(sys.stdin); print(arr[0]['id']) if arr else print('')")
    fi
    [[ -n "$RUNID" ]] || die "No runs found for $REPO."
    echo "Using latest run id: $RUNID"
  else
    read -rp "Enter run ID (leave blank to use latest): " tmp
    if [[ -n "$tmp" ]]; then
      RUNID="$tmp"
    else
      echo "Fetching latest run id for $REPO..."
      if gh run list --repo "$REPO" --limit 1 --json id --jq '.[0].id' >/dev/null 2>&1; then
        RUNID=$(gh run list --repo "$REPO" --limit 1 --json id --jq '.[0].id')
      else
        json=$(gh run list --repo "$REPO" --limit 1 --json id 2>/dev/null) || die "Failed to list runs for $REPO"
        RUNID=$(printf '%s' "$json" | python3 -c "import sys, json; arr=json.load(sys.stdin); print(arr[0]['id']) if arr else print('')")
      fi
      [[ -n "$RUNID" ]] || die "No runs found for $REPO."
      echo "Using latest run id: $RUNID"
    fi
  fi
fi

# Ensure outdir exists
mkdir -p "$OUTDIR"
OUTFILE="$OUTDIR/run-${RUNID}-$(date +%Y%m%d-%H%M%S).log"

echo "Polling logs for run $RUNID in $REPO..."
attempt=0
while [[ $attempt -lt $MAX_ATTEMPTS ]]; do
  attempt=$((attempt+1))
  echo "Attempt $attempt/$MAX_ATTEMPTS..."
  # capture combined output (stdout+stderr)
  output=$(gh run view "$RUNID" --repo "$REPO" --log 2>&1) || rc=$? || true
  rc=${rc:-$?}
  if [[ $rc -eq 0 ]]; then
    printf '%s\n' "$output" > "$OUTFILE"
    echo "Logs saved to: $OUTFILE"
    # open with default app (TextEdit or associated app)
    open "$OUTFILE" || echo "Open failed; file at: $OUTFILE"
    exit 0
  fi

  if printf '%s' "$output" | grep -qi "log not found"; then
    echo "Logs not found yet; sleeping $RETRY_INTERVAL seconds..."
    sleep "$RETRY_INTERVAL"
    continue
  fi

  # Unexpected error
  echo "gh returned an unexpected response:"
  printf '%s\n' "$output"
  die "Aborting."
done

echo "Exceeded $MAX_ATTEMPTS attempts and logs are still not available."

# Handle auto-rerun / prompt
if [[ "$AUTO_RERUN" == "true" ]] || [[ "$NON_INTERACTIVE" == "true" ]]; then
  if [[ "$NON_INTERACTIVE" == "true" && "$AUTO_RERUN" != "true" ]]; then
    echo "Non-interactive mode and auto-rerun not requested: exiting."
    exit 1
  fi
  if [[ "$NON_INTERACTIVE" == "true" ]]; then
    echo "Auto-rerun (non-interactive) triggered..."
    gh run rerun "$RUNID" --repo "$REPO" || die "Failed to trigger rerun."
    echo "Rerun triggered. Use 'gh run watch <new-id> --repo $REPO' to follow it."
    exit 0
  else
    read -rp "Do you want to rerun the workflow now? (y/N): " ans
    if [[ "$ans" =~ ^[Yy]$ ]]; then
      echo "Triggering rerun..."
      rerun_output=$(gh run rerun "$RUNID" --repo "$REPO" 2>&1) || die "Failed to trigger rerun: $rerun_output"
      echo "$rerun_output"
      if printf '%s\n' "$rerun_output" | grep -Eo "actions/runs/[0-9]+" >/dev/null 2>&1; then
        newId=$(printf '%s\n' "$rerun_output" | grep -Eo "actions/runs/[0-9]+" | tail -n1 | sed 's|actions/runs/||')
        echo "Rerun started. New run id: $newId"
      fi
      exit 0
    else
      echo "Rerun canceled."
      exit 1
    fi
  fi
else
  echo "To rerun manually: gh run rerun $RUNID --repo $REPO"
  echo "Or follow the run: gh run watch $RUNID --repo $REPO"
  exit 1
fi