-- v1.0.10: Daily Loyalty retention layer.
-- Adds automatic streak insurance, separate consecutive-streak bonuses,
-- and immutable server-side records used by CC retention analytics.

CREATE TABLE IF NOT EXISTS daily_loyalty_settings (
  season_id TEXT PRIMARY KEY,
  insurance_enabled INTEGER NOT NULL DEFAULT 1 CHECK(insurance_enabled IN (0,1)),
  insurance_every_days INTEGER NOT NULL DEFAULT 7 CHECK(insurance_every_days BETWEEN 2 AND 3650),
  insurance_max INTEGER NOT NULL DEFAULT 2 CHECK(insurance_max BETWEEN 0 AND 30),
  streak_rewards_enabled INTEGER NOT NULL DEFAULT 1 CHECK(streak_rewards_enabled IN (0,1)),
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_loyalty_insurance (
  telegram_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0 CHECK(balance BETWEEN 0 AND 30),
  earned_count INTEGER NOT NULL DEFAULT 0 CHECK(earned_count >= 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK(used_count >= 0),
  last_award_streak INTEGER NOT NULL DEFAULT 0 CHECK(last_award_streak >= 0),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(telegram_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_loyalty_insurance_season
ON daily_loyalty_insurance(season_id, balance, updated_at DESC);

CREATE TABLE IF NOT EXISTS daily_loyalty_insurance_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  day_key TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('earned','used')),
  amount INTEGER NOT NULL DEFAULT 1 CHECK(amount BETWEEN 1 AND 30),
  streak INTEGER NOT NULL DEFAULT 0 CHECK(streak >= 0),
  request_id TEXT NOT NULL DEFAULT '',
  event_key TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_loyalty_insurance_events_season
ON daily_loyalty_insurance_events(season_id, created_at DESC, event_type);
CREATE INDEX IF NOT EXISTS idx_daily_loyalty_insurance_events_player
ON daily_loyalty_insurance_events(telegram_id, season_id, created_at DESC);

CREATE TABLE IF NOT EXISTS daily_loyalty_streak_milestones (
  season_id TEXT NOT NULL,
  streak_threshold INTEGER NOT NULL CHECK(streak_threshold BETWEEN 2 AND 3650),
  label TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK(reward_type IN (
    'points','zefir','coffee','profile_xp','season_xp','case','seasonal_case',
    'booster_points','booster_treats','booster_coffee',
    'avatar','frame','trail','skin','music'
  )),
  amount INTEGER NOT NULL DEFAULT 1 CHECK(amount BETWEEN 1 AND 1000000000),
  item_id TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(season_id, streak_threshold)
);

CREATE INDEX IF NOT EXISTS idx_daily_loyalty_streak_milestones_season
ON daily_loyalty_streak_milestones(season_id, streak_threshold);

CREATE TABLE IF NOT EXISTS daily_loyalty_streak_claims (
  telegram_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  streak_threshold INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1,
  item_id TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL DEFAULT '',
  reward_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'granting' CHECK(status IN ('granting','delivered')),
  source_request_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  delivered_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(telegram_id, season_id, streak_threshold)
);

CREATE INDEX IF NOT EXISTS idx_daily_loyalty_streak_claims_player
ON daily_loyalty_streak_claims(telegram_id, season_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_loyalty_streak_claims_request
ON daily_loyalty_streak_claims(source_request_id, status);

INSERT OR IGNORE INTO daily_loyalty_settings
  (season_id,insurance_enabled,insurance_every_days,insurance_max,streak_rewards_enabled,updated_at)
VALUES
  ('daily-main',1,7,2,1,unixepoch());

-- Conservative defaults. Everything can be changed from CC without a deploy.
INSERT OR IGNORE INTO daily_loyalty_streak_milestones
  (season_id,streak_threshold,label,reward_type,amount,item_id,sort_order,created_at,updated_at)
VALUES
  ('daily-main',7, '×2 очки · 2 забега', 'booster_points',2,'',      7, unixepoch(),unixepoch()),
  ('daily-main',14,'500 зефира',          'zefir',        500,'',     14, unixepoch(),unixepoch()),
  ('daily-main',30,'Мифический кейс',     'case',           1,'mythic',30,unixepoch(),unixepoch());
