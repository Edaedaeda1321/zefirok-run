# P1/P2 patch: platform hardening (items 9–13)

Base: `full_game(2).zip` supplied 2026-09-12.

## 9. Support Center — one authoritative workflow

- `support_ticket_workflow.workflow_state` is authoritative.
- `support_tickets.status` is retained only as a compatibility shadow:
  - `new -> new`
  - `resolved -> resolved`
  - `rejected -> rejected`
  - every other workflow state -> `working`
- Migration `0087` reconciles existing split-brain rows in favor of workflow state.
- D1 triggers keep the legacy shadow synchronized and bridge legacy writers during a rolling deploy without collapsing rich workflow states on normal shadow writes.
- Worker mutations now transition through `setSupportTicketWorkflow()` instead of maintaining a second status state machine.

## 10. Global accountRevision

- Added central async helper `bumpPlayerAccountRevision()` for non-batched mutations; `bumpPlayerAccountRevisionStatement()` remains the atomic batch primitive.
- Migration `0087` adds revision invalidation triggers for account-visible state that was not covered by `0058`: achievements/showcase, albums, Daily, referrals, mail/gifts, tasks/newcomer/co-op, detailed Season Pass claims/entitlements/tasks, rating rewards and polls.
- Existing `0058` coverage remains for admin profile/economy, case/cosmetic ownership, granted cases and `season_pass_players`.
- Revision is intentionally treated as a monotonic invalidation token, not an event counter; multiple mutations in one logical flow may advance it more than once.

## 11. D1 integration gate

New `scripts/check-d1-integration.mjs` runs a real local Wrangler D1 database from a pre-0087 snapshot, applies `0087`, then executes invariant assertions for:

- old DB -> current migration;
- Support workflow/shadow synchronization;
- expanded account revision coverage;
- purchase -> lost response/timeout -> retry;
- price changed before stale purchase;
- case open lease timeout -> retry;
- reward queue duplicate operation + expired lease reclaim;
- Season Pass claim x2;
- stale revision compare-and-swap.

`update.sh` now runs this integration suite before the existing remote predeploy schema gate and deploy.

## 12. Reward Queue idempotency

- Added mandatory `reward_delivery_queue.operation_id` plus a unique partial index.
- Existing rows are backfilled with a collision-safe structured key.
- New Worker producer path refuses missing `telegram_id`, `source_type`, `source_id` or `reward_kind`.
- All current `enqueueRewardDelivery()` producers were audited; each supplies a stable non-empty source id.
- A compatibility trigger fills `operation_id` for an old Worker during rolling deployment.

## 13. Retiring lazy legacy player migrations

- Added `player_legacy_migration_audit` with phases `backfill -> read_fallback -> retired`.
- Hourly server maintenance performs bounded safe backfill for:
  - authoritative economy cutover/recovery;
  - Season Pass Balance v2 / Elite+ historical reconciliation.
- The audit records cutoff, total, migrated, remaining, errors, last check and completion time.
- New players created after each cutoff do not create new historical migration debt.
- When `remaining_rows=0`, normal player reads stop executing legacy mutation paths and retain only read fallback compatibility.
- Control Center system API now exposes the migration audit as `legacyMigrations` so completion can be verified before a future code removal of the fallback implementation.

## Files in this patch

- `src/worker.js`
- `migrations/0087_p1_platform_hardening.sql`
- `scripts/migration-history.lock.json`
- `scripts/check-d1-integration.mjs`
- `scripts/fixtures/d1_pre_0087_snapshot.sql`
- `scripts/fixtures/d1_integration_cases.sql`
- `update.sh`

## Validation performed in this workspace

Passed:

- `node --check src/worker.js`
- `node --check scripts/check-d1-integration.mjs`
- `node scripts/check-migrations.mjs`
- `node scripts/check-database-schema.mjs --contract-only`
- `node scripts/check-operation-system.mjs` — 157 checks
- `node scripts/check-live-content-authority.mjs`
- `node scripts/check-live-content-assets.mjs` — 116 assets
- pre-0087 snapshot -> `0087` -> integration assertion SQL on SQLite

The supplied archive does not contain Wrangler (`node_modules/.bin/wrangler` is absent and there is no cached Wrangler package in this execution environment), so `wrangler d1 execute --local` itself could not be executed here. The real-D1 runner is nevertheless included and made mandatory in `update.sh`; run it in the normal project environment where the existing `npx wrangler deploy` command is available.

## Deploy order

`0087` must exist in remote D1 before deploying the new Worker because the Worker writes `reward_delivery_queue.operation_id` and reads the migration audit table.

```bash
npx wrangler d1 migrations apply zefirok-rewards --remote
./update.sh
```

Do not deploy the new Worker first. The existing predeploy schema gate is intentionally kept after the local D1 integration test.
