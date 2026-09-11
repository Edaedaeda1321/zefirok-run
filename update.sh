#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
node scripts/predeploy-schema-gate.mjs --remote --write-stamp
node scripts/db-doctor.mjs --remote --gate --no-samples
npx wrangler deploy
