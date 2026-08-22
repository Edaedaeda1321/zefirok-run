CREATE TABLE IF NOT EXISTS candidate_daily_seasons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  timezone_offset_minutes INTEGER NOT NULL DEFAULT 180,
  starts_at TEXT NOT NULL DEFAULT '',
  ends_at TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_candidate_daily_seasons_enabled
  ON candidate_daily_seasons(enabled, updated_at DESC);

CREATE TABLE IF NOT EXISTS candidate_daily_milestones (
  season_id TEXT NOT NULL,
  day_index INTEGER NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎁',
  label TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  item_id TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (season_id, day_index),
  FOREIGN KEY (season_id) REFERENCES candidate_daily_seasons(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_candidate_daily_milestones_season
  ON candidate_daily_milestones(season_id, day_index);

CREATE TABLE IF NOT EXISTS candidate_daily_players (
  player_key TEXT NOT NULL,
  season_id TEXT NOT NULL,
  progress_days INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_active_day_key TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (player_key, season_id)
);

CREATE TABLE IF NOT EXISTS candidate_daily_activity (
  player_key TEXT NOT NULL,
  season_id TEXT NOT NULL,
  day_key TEXT NOT NULL,
  request_id TEXT NOT NULL,
  applied INTEGER NOT NULL DEFAULT 0,
  progress_day INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (player_key, season_id, day_key),
  UNIQUE (request_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_daily_activity_player
  ON candidate_daily_activity(player_key, season_id, created_at DESC);

CREATE TABLE IF NOT EXISTS candidate_daily_claims (
  player_key TEXT NOT NULL,
  season_id TEXT NOT NULL,
  day_index INTEGER NOT NULL,
  reward_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'preview_granted',
  source_request_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (player_key, season_id, day_index)
);

CREATE INDEX IF NOT EXISTS idx_candidate_daily_claims_player
  ON candidate_daily_claims(player_key, season_id, created_at DESC);

CREATE TABLE IF NOT EXISTS candidate_daily_test_clock (
  player_key TEXT PRIMARY KEY,
  offset_days INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO candidate_daily_seasons
  (id, title, enabled, timezone_offset_minutes, starts_at, ends_at, revision, created_at, updated_at)
VALUES
  ('season-3-test', 'Тайны Белкино · TEST', 1, 180, '', '', 1, unixepoch(), unixepoch());

INSERT OR IGNORE INTO candidate_daily_milestones
  (season_id, day_index, icon, label, reward_type, amount, item_id, sort_order, created_at, updated_at)
VALUES
  ('season-3-test', 3,  '🍥', '250 зефира',          'zefir',      250,  '',              3,  unixepoch(), unixepoch()),
  ('season-3-test', 5,  '⭐', '+500 XP сезона',      'season_xp',  500,  '',              5,  unixepoch(), unixepoch()),
  ('season-3-test', 7,  '🎁', 'Серебряный кейс',     'case',         1,  'sweet',          7,  unixepoch(), unixepoch()),
  ('season-3-test', 14, '🏆', 'Золотой кейс',        'case',         1,  'gold',          14,  unixepoch(), unixepoch()),
  ('season-3-test', 21, '✨', '+1 500 XP сезона',    'season_xp', 1500,  '',             21,  unixepoch(), unixepoch()),
  ('season-3-test', 28, '🌟', 'Сезонный кейс',       'case',         1,  'seasonal',      28,  unixepoch(), unixepoch()),
  ('season-3-test', 35, '💜', 'Мифический кейс',       'case',         1,  'mythic',        35,  unixepoch(), unixepoch()),
  ('season-3-test', 42, '👑', 'Легендарный кейс',      'case',         1,  'legendary',     42,  unixepoch(), unixepoch());
