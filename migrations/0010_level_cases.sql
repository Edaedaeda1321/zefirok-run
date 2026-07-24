-- 4.0.11: уровневые кейсы, временные усилители и косметика профиля.

CREATE TABLE IF NOT EXISTS case_player_state (
  telegram_id TEXT PRIMARY KEY,
  boosters_points INTEGER NOT NULL DEFAULT 0 CHECK(boosters_points >= 0),
  boosters_treats INTEGER NOT NULL DEFAULT 0 CHECK(boosters_treats >= 0),
  boosters_coffee INTEGER NOT NULL DEFAULT 0 CHECK(boosters_coffee >= 0),
  active_booster_type TEXT NOT NULL DEFAULT '' CHECK(active_booster_type IN ('', 'points', 'treats', 'coffee')),
  active_booster_runs INTEGER NOT NULL DEFAULT 0 CHECK(active_booster_runs >= 0 AND active_booster_runs <= 2),
  owned_avatars_json TEXT NOT NULL DEFAULT '[]',
  active_avatar_id TEXT NOT NULL DEFAULT '',
  owned_frames_json TEXT NOT NULL DEFAULT '[]',
  active_frame_id TEXT NOT NULL DEFAULT '',
  owned_trails_json TEXT NOT NULL DEFAULT '[]',
  active_trail_id TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS level_case_openings (
  telegram_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  case_type TEXT NOT NULL CHECK(case_type IN ('small', 'sweet', 'gold')),
  rewards_json TEXT NOT NULL DEFAULT '[]',
  opened_at INTEGER NOT NULL,
  PRIMARY KEY (telegram_id, level)
);

CREATE INDEX IF NOT EXISTS idx_level_case_openings_player
ON level_case_openings(telegram_id, opened_at DESC);

CREATE TABLE IF NOT EXISTS case_booster_run_consumptions (
  run_id TEXT PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  booster_type TEXT NOT NULL DEFAULT '',
  consumed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_booster_runs_player
ON case_booster_run_consumptions(telegram_id, consumed_at DESC);

ALTER TABLE leaderboard_entries ADD COLUMN case_avatar_id TEXT NOT NULL DEFAULT '';
ALTER TABLE leaderboard_entries ADD COLUMN case_frame_id TEXT NOT NULL DEFAULT '';
ALTER TABLE leaderboard_all_time ADD COLUMN case_avatar_id TEXT NOT NULL DEFAULT '';
ALTER TABLE leaderboard_all_time ADD COLUMN case_frame_id TEXT NOT NULL DEFAULT '';
