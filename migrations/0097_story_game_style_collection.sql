-- Permanent story-exclusive game presentation collection.
-- Choices are independent from case/shop cosmetics; unlocks only come from story progress.
CREATE TABLE IF NOT EXISTS player_game_style_state (
  telegram_id TEXT PRIMARY KEY,
  scene_choice TEXT NOT NULL DEFAULT 'auto',
  treats_choice TEXT NOT NULL DEFAULT 'auto',
  coffee_choice TEXT NOT NULL DEFAULT 'auto',
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  created_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS player_game_style_unlocks (
  telegram_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('scene','treats','coffee')),
  season_id TEXT NOT NULL DEFAULT '',
  source_event_id TEXT NOT NULL DEFAULT '',
  unlocked_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (telegram_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_player_game_style_unlocks_player
  ON player_game_style_unlocks(telegram_id, kind, unlocked_at, item_id);
CREATE INDEX IF NOT EXISTS idx_player_game_style_unlocks_source
  ON player_game_style_unlocks(season_id, source_event_id, kind);
