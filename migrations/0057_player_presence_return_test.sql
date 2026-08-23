-- Player presence + safe comeback simulator for Daily Loyalty.
-- Tracks real game opens without an extra client request and provides an owner-only
-- one-shot return test that does not require mutating historical Daily progress.

CREATE TABLE IF NOT EXISTS player_game_presence (
  telegram_id TEXT PRIMARY KEY,
  first_seen_at INTEGER NOT NULL DEFAULT 0,
  last_seen_at INTEGER NOT NULL DEFAULT 0,
  previous_seen_at INTEGER NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_player_game_presence_last_seen
ON player_game_presence(last_seen_at DESC);

CREATE TABLE IF NOT EXISTS daily_loyalty_return_tests (
  telegram_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  missed_days INTEGER NOT NULL DEFAULT 7 CHECK(missed_days BETWEEN 3 AND 3650),
  grant_reward INTEGER NOT NULL DEFAULT 0 CHECK(grant_reward IN (0,1)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','consumed','cancelled')),
  reason TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(telegram_id,season_id)
);
CREATE INDEX IF NOT EXISTS idx_daily_loyalty_return_tests_pending
ON daily_loyalty_return_tests(status,expires_at,updated_at DESC);
