-- Control Center P0 for Mir Zeffi. Additive, fail-closed administrative release controls.
-- Never updates existing city states, player wallets, purchases, story, or fund rows.
CREATE TABLE IF NOT EXISTS zeffi_world_control (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
  release_mode TEXT NOT NULL DEFAULT 'testers' CHECK(release_mode IN ('off','testers','percentage','all')),
  rollout_percent INTEGER NOT NULL DEFAULT 0 CHECK(rollout_percent BETWEEN 0 AND 100),
  allow_purchases INTEGER NOT NULL DEFAULT 1 CHECK(allow_purchases IN (0,1)),
  allow_story INTEGER NOT NULL DEFAULT 1 CHECK(allow_story IN (0,1)),
  allow_fund INTEGER NOT NULL DEFAULT 1 CHECK(allow_fund IN (0,1)),
  allow_contributions INTEGER NOT NULL DEFAULT 1 CHECK(allow_contributions IN (0,1)),
  allow_residents INTEGER NOT NULL DEFAULT 1 CHECK(allow_residents IN (0,1)),
  last_request_id TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO zeffi_world_control(id) VALUES (1);

CREATE TABLE IF NOT EXISTS zeffi_world_control_testers (
  telegram_id TEXT PRIMARY KEY NOT NULL CHECK(length(telegram_id) BETWEEN 4 AND 20),
  added_by TEXT NOT NULL,
  added_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_zeffi_world_control_testers_added ON zeffi_world_control_testers(added_at DESC);

-- Independent transactional audit: prevents setting changes without a matching immutable receipt.
CREATE TABLE IF NOT EXISTS zeffi_world_control_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  actor_telegram_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('config_save','tester_add','tester_remove')),
  target_telegram_id TEXT NOT NULL DEFAULT '',
  previous_json TEXT NOT NULL,
  next_json TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  guard INTEGER NOT NULL CHECK(guard=1)
);
CREATE INDEX IF NOT EXISTS idx_zeffi_world_control_audit_at ON zeffi_world_control_audit(created_at DESC);

-- Aggregated event counters (no raw initData, request bodies or wallet values).
CREATE TABLE IF NOT EXISTS zeffi_world_control_errors (
  hour_start INTEGER NOT NULL,
  area TEXT NOT NULL,
  status INTEGER NOT NULL CHECK(status BETWEEN 400 AND 599),
  code TEXT NOT NULL,
  occurrences INTEGER NOT NULL DEFAULT 1 CHECK(occurrences > 0),
  last_at INTEGER NOT NULL,
  PRIMARY KEY(hour_start,area,status,code)
);
CREATE INDEX IF NOT EXISTS idx_zeffi_world_control_errors_hour ON zeffi_world_control_errors(hour_start DESC);

CREATE INDEX IF NOT EXISTS idx_zeffi_world_ops_created_at ON zeffi_world_operations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zeffi_community_contributions_created_at ON zeffi_community_contributions(created_at DESC);

-- Count harmless idempotent replays separately from actual 409/5xx errors.
CREATE TABLE IF NOT EXISTS zeffi_world_control_retries (
  hour_start INTEGER NOT NULL,
  area TEXT NOT NULL CHECK(area IN ('personal','fund','residents')),
  occurrences INTEGER NOT NULL DEFAULT 1 CHECK(occurrences > 0),
  last_at INTEGER NOT NULL,
  PRIMARY KEY(hour_start,area)
);
CREATE INDEX IF NOT EXISTS idx_zeffi_world_control_retries_hour ON zeffi_world_control_retries(hour_start DESC);
