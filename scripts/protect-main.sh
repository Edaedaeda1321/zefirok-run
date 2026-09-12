#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-Edaedaeda1321/zefirok-run}"
BRANCH="${BRANCH:-main}"
REQUIRED_CHECK="${REQUIRED_CHECK:-production-gate}"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install it and run: gh auth login" >&2
  exit 1
fi

gh auth status >/dev/null

echo "Protecting ${REPO}:${BRANCH}; required check: ${REQUIRED_CHECK}"
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  "repos/${REPO}/branches/${BRANCH}/protection" \
  --input - <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["${REQUIRED_CHECK}"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false
}
JSON

echo
echo "Current protection summary:"
gh api \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  "repos/${REPO}/branches/${BRANCH}/protection" \
  --jq '{required_status_checks, enforce_admins, required_pull_request_reviews, required_conversation_resolution, allow_force_pushes, allow_deletions}'
