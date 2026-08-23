-- Sweet Run: regular case inventory schema v2.
-- Formalizes support for Mythic/Alex cases and prevents a new D1 migration from
-- being required every time another regular case type is added to the server catalog.
-- The Worker still validates case ids through normalizeCaseType(), so the database
-- no longer needs a hard-coded enum that can drift behind the game code.

ALTER TABLE granted_cases RENAME TO granted_cases_before_catalog_v2;

CREATE TABLE granted_cases (
  id TEXT PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  case_type TEXT NOT NULL CHECK(length(case_type) BETWEEN 1 AND 48),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'opening', 'opened')),
  granted_by TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  rewards_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  opened_at INTEGER,
  opening_started_at INTEGER NOT NULL DEFAULT 0,
  opening_token TEXT NOT NULL DEFAULT ''
);

-- An in-flight opening cannot safely preserve its runtime lease across a schema
-- rebuild. Return it to pending so the player keeps the case and can retry safely.
INSERT INTO granted_cases (
  id,
  telegram_id,
  case_type,
  status,
  granted_by,
  reason,
  rewards_json,
  created_at,
  opened_at,
  opening_started_at,
  opening_token
)
SELECT
  id,
  telegram_id,
  case_type,
  CASE WHEN status = 'opening' THEN 'pending' ELSE status END,
  granted_by,
  reason,
  rewards_json,
  created_at,
  opened_at,
  0,
  ''
FROM granted_cases_before_catalog_v2;

DROP TABLE granted_cases_before_catalog_v2;

CREATE INDEX IF NOT EXISTS idx_granted_cases_player_pending
ON granted_cases(telegram_id, status, case_type, created_at);

CREATE INDEX IF NOT EXISTS idx_granted_cases_created
ON granted_cases(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_granted_cases_opened
ON granted_cases(opened_at);

CREATE INDEX IF NOT EXISTS idx_granted_cases_status_type_v0793
ON granted_cases(status, case_type, created_at);

-- If Mythic/Alex (or another already server-approved regular case) previously
-- failed only because of the old CHECK constraint, make it eligible for an
-- immediate retry after this migration instead of waiting for backoff/cron.
UPDATE reward_delivery_queue
SET status = 'pending',
    available_at = unixepoch(),
    lease_token = '',
    lease_until = 0,
    last_error = '',
    updated_at = unixepoch()
WHERE reward_kind = 'case'
  AND reward_id IN ('small','sweet','gold','mythic','legendary','alex')
  AND status = 'failed'
  AND attempts < 5;
