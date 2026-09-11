#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
node scripts/predeploy-schema-gate.mjs --remote --write-stamp
npx wrangler deploy
