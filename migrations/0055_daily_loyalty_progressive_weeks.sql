-- v1.0.10: progressive daily-reward weeks.
-- Weeks 1..6 become gradually more valuable. After week 6 the server keeps
-- using week-6 rewards, so retention can grow without unbounded inflation.

CREATE TABLE IF NOT EXISTS daily_loyalty_progressive_rewards (
  season_id TEXT NOT NULL,
  week_number INTEGER NOT NULL CHECK(week_number BETWEEN 1 AND 6),
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
  PRIMARY KEY(season_id, week_number, cycle_day)
);

CREATE INDEX IF NOT EXISTS idx_daily_loyalty_progressive_rewards_season
ON daily_loyalty_progressive_rewards(season_id, week_number, cycle_day);

-- The old repeating 7-day configuration remains in its legacy table for rollback/audit,
-- but the new progressive ladder starts from its own explicit values.

-- Conservative defaults. Big 7/14/21/28/35/42 milestones still stack on top,
-- so the guaranteed daily layer can remain useful without flooding the economy.
INSERT OR IGNORE INTO daily_loyalty_progressive_rewards
  (season_id,week_number,cycle_day,label,reward_type,amount,item_id,sort_order,created_at,updated_at)
VALUES
  ('daily-main',1,1,'10 зефира','zefir',10,'',101,unixepoch(),unixepoch()),
  ('daily-main',1,2,'10 кофе','coffee',10,'',102,unixepoch(),unixepoch()),
  ('daily-main',1,3,'300 очков','points',300,'',103,unixepoch(),unixepoch()),
  ('daily-main',1,4,'15 зефира','zefir',15,'',104,unixepoch(),unixepoch()),
  ('daily-main',1,5,'15 кофе','coffee',15,'',105,unixepoch(),unixepoch()),
  ('daily-main',1,6,'500 очков','points',500,'',106,unixepoch(),unixepoch()),
  ('daily-main',1,7,'1 500 очков','points',1500,'',107,unixepoch(),unixepoch()),

  ('daily-main',2,1,'15 зефира','zefir',15,'',201,unixepoch(),unixepoch()),
  ('daily-main',2,2,'15 кофе','coffee',15,'',202,unixepoch(),unixepoch()),
  ('daily-main',2,3,'500 очков','points',500,'',203,unixepoch(),unixepoch()),
  ('daily-main',2,4,'20 зефира','zefir',20,'',204,unixepoch(),unixepoch()),
  ('daily-main',2,5,'20 кофе','coffee',20,'',205,unixepoch(),unixepoch()),
  ('daily-main',2,6,'750 очков','points',750,'',206,unixepoch(),unixepoch()),
  ('daily-main',2,7,'2 500 очков','points',2500,'',207,unixepoch(),unixepoch()),

  ('daily-main',3,1,'20 зефира','zefir',20,'',301,unixepoch(),unixepoch()),
  ('daily-main',3,2,'20 кофе','coffee',20,'',302,unixepoch(),unixepoch()),
  ('daily-main',3,3,'750 очков','points',750,'',303,unixepoch(),unixepoch()),
  ('daily-main',3,4,'25 зефира','zefir',25,'',304,unixepoch(),unixepoch()),
  ('daily-main',3,5,'25 кофе','coffee',25,'',305,unixepoch(),unixepoch()),
  ('daily-main',3,6,'1 000 очков','points',1000,'',306,unixepoch(),unixepoch()),
  ('daily-main',3,7,'4 000 очков','points',4000,'',307,unixepoch(),unixepoch()),

  ('daily-main',4,1,'25 зефира','zefir',25,'',401,unixepoch(),unixepoch()),
  ('daily-main',4,2,'25 кофе','coffee',25,'',402,unixepoch(),unixepoch()),
  ('daily-main',4,3,'1 000 очков','points',1000,'',403,unixepoch(),unixepoch()),
  ('daily-main',4,4,'30 зефира','zefir',30,'',404,unixepoch(),unixepoch()),
  ('daily-main',4,5,'30 кофе','coffee',30,'',405,unixepoch(),unixepoch()),
  ('daily-main',4,6,'1 500 очков','points',1500,'',406,unixepoch(),unixepoch()),
  ('daily-main',4,7,'6 000 очков','points',6000,'',407,unixepoch(),unixepoch()),

  ('daily-main',5,1,'30 зефира','zefir',30,'',501,unixepoch(),unixepoch()),
  ('daily-main',5,2,'30 кофе','coffee',30,'',502,unixepoch(),unixepoch()),
  ('daily-main',5,3,'1 500 очков','points',1500,'',503,unixepoch(),unixepoch()),
  ('daily-main',5,4,'40 зефира','zefir',40,'',504,unixepoch(),unixepoch()),
  ('daily-main',5,5,'40 кофе','coffee',40,'',505,unixepoch(),unixepoch()),
  ('daily-main',5,6,'2 000 очков','points',2000,'',506,unixepoch(),unixepoch()),
  ('daily-main',5,7,'9 000 очков','points',9000,'',507,unixepoch(),unixepoch()),

  ('daily-main',6,1,'40 зефира','zefir',40,'',601,unixepoch(),unixepoch()),
  ('daily-main',6,2,'40 кофе','coffee',40,'',602,unixepoch(),unixepoch()),
  ('daily-main',6,3,'2 000 очков','points',2000,'',603,unixepoch(),unixepoch()),
  ('daily-main',6,4,'50 зефира','zefir',50,'',604,unixepoch(),unixepoch()),
  ('daily-main',6,5,'50 кофе','coffee',50,'',605,unixepoch(),unixepoch()),
  ('daily-main',6,6,'3 000 очков','points',3000,'',606,unixepoch(),unixepoch()),
  ('daily-main',6,7,'15 000 очков','points',15000,'',607,unixepoch(),unixepoch());
