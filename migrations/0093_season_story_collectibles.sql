CREATE TABLE IF NOT EXISTS game_run_story_collectible_drops (
  run_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  collectible_id TEXT NOT NULL,
  series_key TEXT NOT NULL DEFAULT '',
  slot INTEGER NOT NULL,
  spawn_after_ms INTEGER NOT NULL DEFAULT 0,
  caught INTEGER NOT NULL DEFAULT 0 CHECK(caught IN (0,1)),
  counted INTEGER NOT NULL DEFAULT 0 CHECK(counted IN (0,1)),
  config_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(run_id,slot)
);

CREATE INDEX IF NOT EXISTS idx_game_run_story_collectibles_player
  ON game_run_story_collectible_drops(telegram_id,season_id,created_at DESC);

CREATE TABLE IF NOT EXISTS season_story_collectible_progress (
  telegram_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  collectible_id TEXT NOT NULL,
  series_key TEXT NOT NULL DEFAULT '',
  total_collected INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(telegram_id,season_id,collectible_id)
);

CREATE INDEX IF NOT EXISTS idx_season_story_collectible_progress_player
  ON season_story_collectible_progress(telegram_id,updated_at DESC);
