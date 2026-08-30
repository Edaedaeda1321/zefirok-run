-- Independent consumable boosters + one-run Shield / Second Chance.
-- Keep the historical active_booster_type projection for classic boosters only;
-- the authoritative multi-booster state lives in JSON and per-run snapshots.

ALTER TABLE case_player_state ADD COLUMN boosters_extra_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE case_player_state ADD COLUMN active_boosters_json TEXT NOT NULL DEFAULT '{}';

UPDATE case_player_state
SET active_boosters_json = json_object(
  'points', CASE WHEN active_booster_type='points' THEN CASE WHEN active_booster_runs < 0 THEN 0 WHEN active_booster_runs > 2 THEN 2 ELSE active_booster_runs END ELSE 0 END,
  'treats', CASE WHEN active_booster_type='treats' THEN CASE WHEN active_booster_runs < 0 THEN 0 WHEN active_booster_runs > 2 THEN 2 ELSE active_booster_runs END ELSE 0 END,
  'coffee', CASE WHEN active_booster_type='coffee' THEN CASE WHEN active_booster_runs < 0 THEN 0 WHEN active_booster_runs > 2 THEN 2 ELSE active_booster_runs END ELSE 0 END,
  'shield', 0,
  'second_chance', 0
)
WHERE active_boosters_json='{}' OR active_boosters_json='';

-- These tables are normally created by the Worker runtime bootstrap. Creating
-- their pre-0069 shape here keeps the migration safe on a clean D1 database.
CREATE TABLE IF NOT EXISTS game_run_sessions (
  run_id TEXT PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  started_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  finished_at_ms INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  run_treats INTEGER NOT NULL DEFAULT 0,
  run_coffee INTEGER NOT NULL DEFAULT 0,
  economy_points INTEGER NOT NULL DEFAULT 0,
  economy_treats INTEGER NOT NULL DEFAULT 0,
  economy_coffee INTEGER NOT NULL DEFAULT 0,
  profile_xp INTEGER NOT NULL DEFAULT 0,
  new_record INTEGER NOT NULL DEFAULT 0,
  accepted_rating INTEGER NOT NULL DEFAULT 0,
  season_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

ALTER TABLE game_run_sessions ADD COLUMN booster_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_run_sessions ADD COLUMN booster_treats INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_run_sessions ADD COLUMN booster_coffee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_run_sessions ADD COLUMN booster_shield INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_run_sessions ADD COLUMN booster_second_chance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_run_sessions ADD COLUMN shield_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_run_sessions ADD COLUMN second_chance_used INTEGER NOT NULL DEFAULT 0;

ALTER TABLE case_booster_run_consumptions ADD COLUMN booster_types_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS player_economy_run_ledger (
  run_id TEXT PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  treats INTEGER NOT NULL DEFAULT 0,
  coffee INTEGER NOT NULL DEFAULT 0,
  profile_xp INTEGER NOT NULL DEFAULT 0,
  raw_score INTEGER NOT NULL DEFAULT 0,
  raw_treats INTEGER NOT NULL DEFAULT 0,
  raw_coffee INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  booster_type TEXT NOT NULL DEFAULT '',
  skin_id TEXT NOT NULL DEFAULT 'default',
  new_record INTEGER NOT NULL DEFAULT 0,
  accepted_rating INTEGER NOT NULL DEFAULT 0,
  season_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

ALTER TABLE player_economy_run_ledger ADD COLUMN booster_types_json TEXT NOT NULL DEFAULT '[]';
