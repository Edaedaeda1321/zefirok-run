-- v1.0.10: server-authoritative daily loyalty / Coffee Card.
-- The server owns the day boundary, progression, streak and reward delivery.
-- One player can advance only once per server day; reward snapshots are immutable.

CREATE TABLE IF NOT EXISTS daily_loyalty_seasons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  timezone_offset_minutes INTEGER NOT NULL DEFAULT 180 CHECK(timezone_offset_minutes BETWEEN -720 AND 840),
  starts_at INTEGER NOT NULL DEFAULT 0,
  ends_at INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_daily_loyalty_seasons_active
ON daily_loyalty_seasons(enabled, starts_at, ends_at, updated_at DESC);

CREATE TABLE IF NOT EXISTS daily_loyalty_milestones (
  season_id TEXT NOT NULL,
  day_index INTEGER NOT NULL CHECK(day_index BETWEEN 1 AND 3650),
  icon TEXT NOT NULL DEFAULT '🎁',
  label TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK(reward_type IN ('points','zefir','coffee','profile_xp','season_xp','case','seasonal_case','booster_points','booster_treats','booster_coffee','avatar','frame','trail','skin','music')),
  amount INTEGER NOT NULL DEFAULT 1 CHECK(amount BETWEEN 1 AND 1000000000),
  item_id TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(season_id, day_index)
);

CREATE INDEX IF NOT EXISTS idx_daily_loyalty_milestones_season
ON daily_loyalty_milestones(season_id, day_index);

CREATE TABLE IF NOT EXISTS daily_loyalty_players (
  telegram_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  progress_days INTEGER NOT NULL DEFAULT 0 CHECK(progress_days >= 0),
  streak INTEGER NOT NULL DEFAULT 0 CHECK(streak >= 0),
  best_streak INTEGER NOT NULL DEFAULT 0 CHECK(best_streak >= 0),
  last_active_day_key TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(telegram_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_loyalty_players_streak
ON daily_loyalty_players(season_id, streak DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS daily_loyalty_activity (
  telegram_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  day_key TEXT NOT NULL,
  request_id TEXT NOT NULL,
  applied INTEGER NOT NULL DEFAULT 0 CHECK(applied IN (0,1)),
  progress_day INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(telegram_id, season_id, day_key),
  UNIQUE(request_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_loyalty_activity_player
ON daily_loyalty_activity(telegram_id, season_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_loyalty_activity_day
ON daily_loyalty_activity(season_id, day_key, applied);

CREATE TABLE IF NOT EXISTS daily_loyalty_claims (
  telegram_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  day_index INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1,
  item_id TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '🎁',
  reward_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'granting' CHECK(status IN ('granting','delivered')),
  source_request_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  delivered_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(telegram_id, season_id, day_index)
);

CREATE INDEX IF NOT EXISTS idx_daily_loyalty_claims_player
ON daily_loyalty_claims(telegram_id, season_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_loyalty_claims_request
ON daily_loyalty_claims(source_request_id, status);

INSERT OR IGNORE INTO daily_loyalty_seasons
  (id,title,enabled,timezone_offset_minutes,starts_at,ends_at,revision,created_at,updated_at,updated_by)
VALUES
  ('daily-main','Кофейная карточка Зеффи',1,180,0,0,1,unixepoch(),unixepoch(),'migration-0051');

-- Candidate V4 reward ladder, now backed by the real Production economy.
INSERT OR IGNORE INTO daily_loyalty_milestones
  (season_id,day_index,icon,label,reward_type,amount,item_id,sort_order,created_at,updated_at)
VALUES
  ('daily-main',3, '🍥','250 зефира',       'zefir',        250,'',       3, unixepoch(),unixepoch()),
  ('daily-main',5, '⭐','+500 XP сезона',   'season_xp',    500,'',       5, unixepoch(),unixepoch()),
  ('daily-main',7, '🎁','Серебряный кейс', 'case',           1,'sweet',  7, unixepoch(),unixepoch()),
  ('daily-main',14,'🏆','Золотой кейс',     'case',           1,'gold',  14, unixepoch(),unixepoch()),
  ('daily-main',21,'✨','+1 500 XP сезона', 'season_xp',   1500,'',      21, unixepoch(),unixepoch()),
  ('daily-main',28,'🌟','Сезонный кейс',    'seasonal_case',  1,'',      28, unixepoch(),unixepoch()),
  ('daily-main',35,'💜','Мифический кейс',  'case',           1,'mythic',35, unixepoch(),unixepoch()),
  ('daily-main',42,'👑','Легендарный кейс', 'case',           1,'legendary',42,unixepoch(),unixepoch());
