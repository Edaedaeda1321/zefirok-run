-- Сезонный рейтинг, забеги и награды.
CREATE TABLE IF NOT EXISTS leaderboard_seasons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended', 'cancelled')),
  reward_type TEXT NOT NULL DEFAULT 'coffee',
  reward_amount INTEGER NOT NULL DEFAULT 0,
  reward_claim_days INTEGER NOT NULL DEFAULT 30,
  reset_plan_json TEXT NOT NULL DEFAULT '{}',
  close_reason TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  finalized_at INTEGER
);

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  season_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL DEFAULT '',
  best_score INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  achieved_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
  PRIMARY KEY (season_id, telegram_id),
  FOREIGN KEY (season_id) REFERENCES leaderboard_seasons(id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_rank
ON leaderboard_entries(season_id, hidden, best_score DESC, achieved_at ASC);

CREATE TABLE IF NOT EXISTS leaderboard_all_time (
  telegram_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL DEFAULT '',
  best_score INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  achieved_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_all_time_rank
ON leaderboard_all_time(hidden, best_score DESC, achieved_at ASC);

CREATE TABLE IF NOT EXISTS leaderboard_runs (
  run_id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  accepted INTEGER NOT NULL DEFAULT 1 CHECK (accepted IN (0, 1)),
  rejection_reason TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (season_id) REFERENCES leaderboard_seasons(id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_runs_player
ON leaderboard_runs(season_id, telegram_id, created_at DESC);

CREATE TABLE IF NOT EXISTS leaderboard_rewards (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  place INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  reward_amount INTEGER NOT NULL DEFAULT 0,
  reward_item_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired', 'cancelled')),
  created_at INTEGER NOT NULL,
  claimed_at INTEGER,
  expires_at INTEGER NOT NULL,
  UNIQUE (season_id, telegram_id, reward_type),
  FOREIGN KEY (season_id) REFERENCES leaderboard_seasons(id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rewards_player
ON leaderboard_rewards(telegram_id, status, created_at DESC);
