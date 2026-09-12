#!/usr/bin/env bash
set -euo pipefail

SKIP_INSTALL=0
if [[ "${1:-}" == "--skip-install" ]]; then
  SKIP_INSTALL=1
elif [[ $# -gt 0 ]]; then
  echo "Usage: $0 [--skip-install]" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: apply-repo-hygiene.sh must be run inside the zefirok-run Git working tree." >&2
  exit 1
fi

# Fail before any repository mutation if package metadata is incomplete.
node scripts/check-package-lock.mjs

legacy_ui=(
  battle-pass_New_Version.html
  battle-pass_test.html
  battle-pass_testing_v1.0.9.html
  index_test.html
  index_testing_v1.0.9.html
  legal_test.html
  rating_test.html
  rating_testing_v1.0.9.html
  referrals_test.html
)
legacy_patches=(
  battle-pass_case_center_fix.patch
  changes.patch
  menu_only.diff
  second-chance-layout.patch
)
legacy_root=("${legacy_ui[@]}" "${legacy_patches[@]}")

# Never delete a root copy unless the replacement archive file was extracted successfully.
for rel in "${legacy_ui[@]}"; do
  [[ -f "dev-history/ui/$rel" ]] || { echo "ERROR: missing dev-history/ui/$rel; aborting cleanup." >&2; exit 1; }
done
for rel in "${legacy_patches[@]}"; do
  [[ -f "dev-history/patches/$rel" ]] || { echo "ERROR: missing dev-history/patches/$rel; aborting cleanup." >&2; exit 1; }
done

# Install first. npm ci itself recreates node_modules from the committed lockfile.
# If install/network fails, the repository cleanup below has not run yet.
if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  npm ci --no-audit --no-fund
else
  echo "Skipping npm ci by request; run it before asset-optimization work."
fi

for rel in "${legacy_root[@]}"; do
  if [[ -e "$rel" ]]; then
    git rm -f --ignore-unmatch -- "$rel" >/dev/null || true
    rm -f -- "$rel"
  fi
done

git rm -f --ignore-unmatch -- BASE_COMMIT.txt >/dev/null || true
rm -f BASE_COMMIT.txt

# Stop tracking dependencies without deleting the freshly installed local copy.
git rm -r --cached --ignore-unmatch -- node_modules >/dev/null || true

node scripts/check-repo-hygiene.mjs

echo
echo "Repository hygiene applied. Review 'git status', then commit the removals/moves and new package metadata."
