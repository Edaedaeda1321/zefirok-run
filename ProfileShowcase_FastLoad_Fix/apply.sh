#!/usr/bin/env bash
set -euo pipefail
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="${1:-$SELF_DIR/..}"
PATCH_PATH="$SELF_DIR/profile-showcase-fast-load.patch"
cd "$ROOT"
if [[ ! -f index.html || ! -f src/worker.js ]]; then
  echo "Repository root not found: $ROOT"
  echo "Extract ProfileShowcase_FastLoad_Fix into zefirok-run or pass the repo path as the first argument."
  exit 1
fi
git apply --check "$PATCH_PATH"
git apply "$PATCH_PATH"
node --check src/worker.js
node scripts/check-p1-read-paths.mjs
git diff --check
echo "Profile showcase fast-load fix applied successfully."
