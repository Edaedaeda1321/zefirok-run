# DB Doctor D1 batching hotfix

## Problem
`db-doctor.mjs` combined all enabled integrity COUNT checks into one `UNION ALL` statement. Production currently enables 21 checks, and Cloudflare D1 rejects that compound SELECT with `SQLITE_ERROR: too many terms in compound SELECT`.

## Fix
- Keep every existing DB Doctor check and its severity unchanged.
- Build the same normalized COUNT SELECT for each check.
- Execute them in deterministic batches of 4 checks per D1 request.
- Merge all returned `check_id / issue_count` rows before applying the existing critical/warning gate.
- Sample-query behavior and gate semantics are unchanged.

No D1 migration is required.
