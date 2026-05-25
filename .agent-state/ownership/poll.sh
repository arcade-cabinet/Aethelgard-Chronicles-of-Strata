#!/usr/bin/env bash
# Phase-aware ownership poll. Drives a multi-stage release ladder:
#   PHASE 1: PR #10 unmerged → poll its merge gate (DONE — merged 06:43Z).
#   PHASE 2: release-please PR open → poll its CI + auto-merge when green.
#   PHASE 3: release tag created → poll Pages deploy until live.
#   PHASE 4: Pages live → playthrough screenshot battery (one-shot).
#   PHASE 5: post-release → poll for issues / regressions.
#
# Each phase writes its read of the world to state.json and prints
# a single line that the cron-fire.mjs wrapper consumes.
#
# Args / env: none. Reads the repo it sits in.

set -u
cd "$(dirname "$0")/../.."

LOG=.agent-state/ownership/poll.log
STATE_FILE=.agent-state/ownership/state.json
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

REPO=arcade-cabinet/Aethelgard-Chronicles-of-Strata

# --- PR #10 ---
pr10_state=$(gh pr view 10 --repo $REPO --json state -q .state 2>/dev/null || echo UNKNOWN)

# --- release-please ---
rp_pr=$(gh pr list --repo $REPO --state open --json number,headRefName -q '.[] | select(.headRefName | startswith("release-please")) | .number' 2>/dev/null | head -1)
rp_state=""
if [ -n "$rp_pr" ]; then
  rp_state=$(gh pr view $rp_pr --repo $REPO --json mergeStateStatus,mergeable -q '.mergeStateStatus + "|" + .mergeable' 2>/dev/null || echo UNKNOWN)
fi

# --- latest release tag ---
latest_tag=$(gh release list --repo $REPO --limit 1 --json tagName -q '.[0].tagName' 2>/dev/null || echo "")
latest_tag_ts=$(gh release list --repo $REPO --limit 1 --json publishedAt -q '.[0].publishedAt' 2>/dev/null || echo "")

# --- Pages deploy ---
# The 'pages-build-deployment' workflow is the GitHub-managed one.
pages_status=$(gh run list --repo $REPO --workflow pages-build-deployment --limit 1 --json status,conclusion --jq '.[0].status + "|" + (.[0].conclusion // "in-progress")' 2>/dev/null || echo "UNKNOWN|UNKNOWN")
# Also our CD workflow (which builds + deploys Pages)
cd_status=$(gh run list --repo $REPO --workflow CD --branch main --limit 1 --json status,conclusion --jq '.[0].status + "|" + (.[0].conclusion // "in-progress")' 2>/dev/null || echo "UNKNOWN|UNKNOWN")

# --- main CI ---
main_ci=$(gh run list --repo $REPO --workflow CI --branch main --limit 1 --json status,conclusion --jq '.[0].status + "|" + (.[0].conclusion // "in-progress")' 2>/dev/null || echo "UNKNOWN|UNKNOWN")

# --- phase decision ---
phase=5
reason="default"
if [ "$pr10_state" != "MERGED" ]; then
  phase=1; reason="pr10-open"
elif [ -n "$rp_pr" ] && [ "${rp_state%%|*}" = "CLEAN" ] && [ "${rp_state#*|}" = "MERGEABLE" ]; then
  phase=2; reason="release-please-ready"
elif [ -n "$rp_pr" ]; then
  phase=2; reason="release-please-blocked:$rp_state"
elif [ "${cd_status%|*}" = "in_progress" ] || [ "${pages_status%|*}" = "in_progress" ]; then
  phase=3; reason="pages-deploying"
elif [ ! -f .agent-state/ownership/.screenshots-done ]; then
  phase=4; reason="screenshots-pending"
fi

# --- needs_action heuristic ---
needs_action="false"
nr=""
case $phase in
  1) needs_action="true"; nr="pr10-still-open" ;;
  2)
    if [ "$reason" = "release-please-ready" ]; then needs_action="true"; nr="merge-release-pr"
    elif [ "${main_ci%|*}" = "completed" ] && [ "${main_ci#*|}" = "failure" ]; then needs_action="true"; nr="main-ci-failed"
    fi ;;
  3) needs_action="false"; nr="waiting-pages" ;;
  4) needs_action="true"; nr="run-screenshots" ;;
  5)
    if [ "${main_ci%|*}" = "completed" ] && [ "${main_ci#*|}" = "failure" ]; then needs_action="true"; nr="main-regression"; fi ;;
esac

printf '%s phase=%d %s pr10=%s rp=%s/%s tag=%s cd=%s pages=%s ci=%s needs=%s\n' \
  "$TS" "$phase" "$reason" "$pr10_state" "${rp_pr:-none}" "$rp_state" "$latest_tag" "$cd_status" "$pages_status" "$main_ci" "$needs_action" >> "$LOG"

cat > "$STATE_FILE" <<JSON
{
  "ts": "$TS",
  "phase": $phase,
  "reason": "$reason",
  "pr10_state": "$pr10_state",
  "release_please_pr": "${rp_pr:-null}",
  "release_please_state": "$rp_state",
  "latest_tag": "$latest_tag",
  "latest_tag_ts": "$latest_tag_ts",
  "cd_status": "$cd_status",
  "pages_status": "$pages_status",
  "main_ci": "$main_ci",
  "needs_action": $needs_action,
  "next_action": "$nr"
}
JSON

echo "phase=$phase needs=$needs_action next=$nr"
