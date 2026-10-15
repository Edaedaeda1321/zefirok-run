#!/usr/bin/env bash
# Read-only Cloudflare analytics: does NOT run SQL against production D1.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT_DIR="${1:-$HOME/Downloads/d1-usage-$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$OUT_DIR"
for DB_NAME in zefirok-rewards zefirok-candidate-v4-daily; do
  for SORT_BY in reads count; do
    OUTPUT="$OUT_DIR/${DB_NAME}-${SORT_BY}-1d.json"
    echo "Reading Cloudflare D1 Insights for $DB_NAME, sorted by $SORT_BY ..."
    if npx --yes wrangler@4.131.1 d1 insights "$DB_NAME" \
        --timePeriod=1d --sort-type=sum --sort-by="$SORT_BY" --sort-direction=DESC --limit=25 --json > "$OUTPUT"; then
      echo "Saved: $OUTPUT"
    else
      rm -f "$OUTPUT"
      echo "Failed: $DB_NAME / $SORT_BY (check Wrangler authentication or CLI help)." >&2
    fi
  done
done
printf '\nFinished. Diagnostic files are outside the repository: %s\n' "$OUT_DIR"
