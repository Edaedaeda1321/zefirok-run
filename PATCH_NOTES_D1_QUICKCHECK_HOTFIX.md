# D1 remote quick_check hotfix

## Problem
Cloudflare D1 returns `SQLITE_NOMEM` for full `PRAGMA quick_check` on the production database. The command is too resource-intensive to be a mandatory deploy-time probe.

## Fix
- Keeps strict remote schema validation (tables, columns, indexes, triggers, schema-contract marker).
- Keeps the previous batching of `pragma_table_info` requests (5 tables per query).
- Replaces mandatory deploy-time `PRAGMA quick_check` with lightweight `SELECT 1 AS ok` connectivity/read probe.
- `PRAGMA quick_check` remains available only when explicitly requested:
  `node scripts/check-database-schema.mjs --remote --quick-check`
- `predeploy-schema-gate.mjs` no longer blocks deployment on a D1 resource-heavy full database scan.
- `db-doctor.mjs --remote --gate --no-samples` still runs immediately after predeploy and validates critical application invariants.

No D1 migration is required.
