-- P1: server-published Mir Zeffi catalogue and levels, additive and fail-closed.
-- Existing city saves, wallets, claims and project funds are never modified.
CREATE TABLE IF NOT EXISTS zeffi_world_balance_config (
  id INTEGER PRIMARY KEY CHECK(id=1),
  draft_revision INTEGER NOT NULL DEFAULT 0 CHECK(draft_revision>=0),
  published_revision INTEGER NOT NULL DEFAULT 0 CHECK(published_revision>=0),
  draft_json TEXT,
  published_json TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0,
  published_at INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT NOT NULL DEFAULT '',
  published_by TEXT NOT NULL DEFAULT '',
  last_request_id TEXT NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO zeffi_world_balance_config(id) VALUES (1);
CREATE TABLE IF NOT EXISTS zeffi_world_balance_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT UNIQUE NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('draft_save','publish','restore_draft')),
  draft_revision INTEGER NOT NULL,
  published_revision INTEGER NOT NULL,
  previous_json TEXT,
  next_json TEXT,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  guard INTEGER NOT NULL CHECK(guard=1)
);
CREATE INDEX IF NOT EXISTS idx_zeffi_world_balance_audit_date ON zeffi_world_balance_audit(created_at DESC);
