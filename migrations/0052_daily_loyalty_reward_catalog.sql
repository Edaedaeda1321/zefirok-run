-- v1.0.10 follow-up: expand Daily Loyalty rewards without losing existing data.
-- Needed when 0051 was already applied before the full server reward catalog was enabled.

DROP TABLE IF EXISTS daily_loyalty_milestones_v2;

CREATE TABLE daily_loyalty_milestones_v2 (
  season_id TEXT NOT NULL,
  day_index INTEGER NOT NULL CHECK(day_index BETWEEN 1 AND 3650),
  icon TEXT NOT NULL DEFAULT '',
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
  PRIMARY KEY(season_id, day_index)
);

INSERT INTO daily_loyalty_milestones_v2
  (season_id,day_index,icon,label,reward_type,amount,item_id,sort_order,created_at,updated_at)
SELECT
  season_id,day_index,icon,label,reward_type,amount,item_id,sort_order,created_at,updated_at
FROM daily_loyalty_milestones;

DROP TABLE daily_loyalty_milestones;
ALTER TABLE daily_loyalty_milestones_v2 RENAME TO daily_loyalty_milestones;

CREATE INDEX IF NOT EXISTS idx_daily_loyalty_milestones_season
ON daily_loyalty_milestones(season_id, day_index);
