-- Legal documents v1: current acceptance state + append-only acceptance history.
-- Worker self-heals these tables too, so rolling deploys remain safe.

CREATE TABLE IF NOT EXISTS legal_acceptance_state (
  telegram_id TEXT PRIMARY KEY,
  agreement_version TEXT NOT NULL DEFAULT '',
  agreement_accepted_at INTEGER NOT NULL DEFAULT 0,
  privacy_version TEXT NOT NULL DEFAULT '',
  privacy_acknowledged_at INTEGER NOT NULL DEFAULT 0,
  consent_version TEXT NOT NULL DEFAULT '',
  consent_accepted_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS legal_acceptance_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  document_key TEXT NOT NULL CHECK(document_key IN ('agreement','privacy','consent')),
  document_version TEXT NOT NULL,
  acceptance_kind TEXT NOT NULL CHECK(acceptance_kind IN ('accepted','acknowledged')),
  language TEXT NOT NULL DEFAULT 'ru' CHECK(language IN ('ru','en')),
  accepted_at INTEGER NOT NULL,
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  event_group_id TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_history_unique_version
ON legal_acceptance_history(telegram_id,document_key,document_version,acceptance_kind);

CREATE INDEX IF NOT EXISTS idx_legal_history_player_recent
ON legal_acceptance_history(telegram_id,accepted_at DESC,id DESC);
