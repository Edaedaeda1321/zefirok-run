-- v1.0.10: guaranteed repeating 7-day reward cycle.
-- Every successful daily check-in gives a base reward. Days 1-6 are modest;
-- day 7 is deliberately stronger. The cycle repeats indefinitely.

CREATE TABLE IF NOT EXISTS daily_loyalty_weekly_rewards (
  season_id TEXT NOT NULL,
  cycle_day INTEGER NOT NULL CHECK(cycle_day BETWEEN 1 AND 7),
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
  PRIMARY KEY(season_id, cycle_day)
);

CREATE INDEX IF NOT EXISTS idx_daily_loyalty_weekly_rewards_season
ON daily_loyalty_weekly_rewards(season_id, cycle_day);

CREATE TABLE IF NOT EXISTS daily_loyalty_weekly_claims (
  telegram_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  progress_day INTEGER NOT NULL CHECK(progress_day >= 1),
  cycle_day INTEGER NOT NULL CHECK(cycle_day BETWEEN 1 AND 7),
  cycle_number INTEGER NOT NULL CHECK(cycle_number >= 1),
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
  PRIMARY KEY(telegram_id, season_id, progress_day)
);

CREATE INDEX IF NOT EXISTS idx_daily_loyalty_weekly_claims_player
ON daily_loyalty_weekly_claims(telegram_id, season_id, progress_day DESC);
CREATE INDEX IF NOT EXISTS idx_daily_loyalty_weekly_claims_request
ON daily_loyalty_weekly_claims(source_request_id, status);

-- Conservative defaults: something useful every day, with a visibly stronger D7.
-- All seven rewards are editable from Control Center without a deploy.
INSERT OR IGNORE INTO daily_loyalty_weekly_rewards
  (season_id,cycle_day,label,reward_type,amount,item_id,sort_order,created_at,updated_at)
VALUES
  ('daily-main',1,'25 зефира',      'zefir',  25,'',      1,unixepoch(),unixepoch()),
  ('daily-main',2,'25 кофе',        'coffee', 25,'',      2,unixepoch(),unixepoch()),
  ('daily-main',3,'750 очков',      'points',750,'',      3,unixepoch(),unixepoch()),
  ('daily-main',4,'30 зефира',      'zefir',  30,'',      4,unixepoch(),unixepoch()),
  ('daily-main',5,'30 кофе',        'coffee', 30,'',      5,unixepoch(),unixepoch()),
  ('daily-main',6,'1 500 очков',    'points',1500,'',     6,unixepoch(),unixepoch()),
  ('daily-main',7,'Золотой кейс',   'case',    1,'gold',  7,unixepoch(),unixepoch());
