-- Achievements V2: idempotent player reward claims.
-- Progress remains derived from existing authoritative game tables.

CREATE TABLE IF NOT EXISTS achievement_claims (
  telegram_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  reward_json TEXT NOT NULL DEFAULT '{}',
  queue_id INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','delivered','failed')),
  request_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  delivered_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(telegram_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievement_claims_player
ON achievement_claims(telegram_id, status, created_at DESC);
