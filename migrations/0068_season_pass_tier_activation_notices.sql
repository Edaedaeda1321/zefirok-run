-- Season Pass tier activation celebration: one server-authoritative notice per real tier grant.
-- The first client surface that claims the notice presents it; other surfaces must not duplicate it.

CREATE TABLE IF NOT EXISTS season_pass_tier_activation_notices (
  notice_id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  previous_tier TEXT NOT NULL DEFAULT 'none' CHECK(previous_tier IN ('none','elite','elite_plus')),
  new_tier TEXT NOT NULL CHECK(new_tier IN ('elite','elite_plus')),
  source TEXT NOT NULL DEFAULT '',
  source_key TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  activated_at INTEGER NOT NULL,
  claimed_at INTEGER NOT NULL DEFAULT 0,
  claimed_surface TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_season_pass_tier_activation_source
  ON season_pass_tier_activation_notices(season_id,telegram_id,source_key);

CREATE INDEX IF NOT EXISTS idx_season_pass_tier_activation_pending
  ON season_pass_tier_activation_notices(telegram_id,season_id,claimed_at,activated_at);
