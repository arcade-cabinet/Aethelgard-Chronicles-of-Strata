#!/usr/bin/env bash
# Ownership poll for PR #10 — runs every 15 min from cron.
# Prints a compact status row + flags whether agent intervention is needed.
# The cron caller (./.agent-state/ownership/cron-fire.mjs) reads this and
# decides whether to re-invoke claude with an autonomous-loop prompt.

set -u
cd "$(dirname "$0")/../.."

PR=10
BRANCH=fix/mountain-massif-not-strip
LOG=.agent-state/ownership/poll.log
STATE_FILE=.agent-state/ownership/state.json
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

merge_state=$(gh pr view $PR --json mergeStateStatus,reviewDecision,state --jq '.mergeStateStatus + "|" + (.reviewDecision // "EMPTY") + "|" + .state' 2>/dev/null || echo "UNKNOWN|UNKNOWN|UNKNOWN")
ci_status=$(gh run list --branch $BRANCH --limit 1 --json status,conclusion --jq '.[0].status + "|" + (.[0].conclusion // "in-progress")' 2>/dev/null || echo "UNKNOWN|UNKNOWN")
unresolved=$(gh api graphql -f query='{repository(owner:"arcade-cabinet",name:"Aethelgard-Chronicles-of-Strata"){pullRequest(number:10){reviewThreads(first:100){nodes{isResolved}}}}}' --jq '.data.repository.pullRequest.reviewThreads.nodes | map(select(.isResolved==false)) | length' 2>/dev/null || echo "?")
latest_review=$(gh api graphql -f query='{repository(owner:"arcade-cabinet",name:"Aethelgard-Chronicles-of-Strata"){pullRequest(number:10){reviews(last:1){nodes{submittedAt state}}}}}' --jq '.data.repository.pullRequest.reviews.nodes[0] | "\(.submittedAt)|\(.state)"' 2>/dev/null || echo "?|?")

mark_ts=$(jq -r '.lastSeenReviewAt // ""' "$STATE_FILE" 2>/dev/null || echo "")
new_review="false"
latest_ts=${latest_review%%|*}
if [ "$latest_ts" != "?" ] && [ "$latest_ts" != "$mark_ts" ]; then new_review="true"; fi

needs_action="false"
reason=""
if [ "$new_review" = "true" ] && [ "$unresolved" != "0" ]; then
  needs_action="true"; reason="new-review+unresolved=$unresolved"
elif [ "${ci_status%|*}" = "completed" ] && [ "${ci_status#*|}" = "failure" ]; then
  needs_action="true"; reason="ci-failed"
elif [ "${merge_state%%|*}" = "CLEAN" ] && [ "${ci_status%|*}" = "completed" ] && [ "${ci_status#*|}" = "success" ]; then
  needs_action="true"; reason="ready-to-merge"
fi

printf '%s pr=%s ci=%s threads=%s review=%s needs=%s reason=%s\n' \
  "$TS" "$merge_state" "$ci_status" "$unresolved" "$latest_review" "$needs_action" "$reason" >> "$LOG"

cat > "$STATE_FILE" <<JSON
{
  "ts": "$TS",
  "pr": $PR,
  "merge_state": "$merge_state",
  "ci_status": "$ci_status",
  "unresolved_threads": "$unresolved",
  "latest_review": "$latest_review",
  "lastSeenReviewAt": "$latest_ts",
  "needs_action": $needs_action,
  "reason": "$reason"
}
JSON

echo "$needs_action|$reason"
