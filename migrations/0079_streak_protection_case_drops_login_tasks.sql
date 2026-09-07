-- v0.79.9: streak protection inventory/overflow, runner case drops and login-day Season Pass tasks.
-- New features are conservative by default: runner case drops remain disabled until enabled in Control Center.

CREATE TABLE IF NOT EXISTS daily_loyalty_protection_settings (
  season_id TEXT PRIMARY KEY,
  max_balance INTEGER NOT NULL DEFAULT 3 CHECK(max_balance BETWEEN 0 AND 30),
  overflow_reward_type TEXT NOT NULL DEFAULT 'points' CHECK(overflow_reward_type IN ('points','zefir','coffee')),
  overflow_reward_amount INTEGER NOT NULL DEFAULT 1500 CHECK(overflow_reward_amount BETWEEN 1 AND 1000000000),
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO daily_loyalty_protection_settings
  (season_id,max_balance,overflow_reward_type,overflow_reward_amount,updated_at)
VALUES ('daily-main',3,'points',1500,unixepoch());

-- Preserve existing inventory. Only the old stock default of 2 is promoted to the new default of 3.
UPDATE daily_loyalty_settings
SET insurance_max=3,updated_at=unixepoch()
WHERE season_id='daily-main' AND insurance_max=2;

CREATE TABLE IF NOT EXISTS daily_loyalty_protection_grants (
  source_key TEXT PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT '',
  requested INTEGER NOT NULL CHECK(requested BETWEEN 1 AND 30),
  granted INTEGER NOT NULL DEFAULT 0 CHECK(granted BETWEEN 0 AND 30),
  overflow INTEGER NOT NULL DEFAULT 0 CHECK(overflow BETWEEN 0 AND 30),
  compensation_type TEXT NOT NULL DEFAULT 'points' CHECK(compensation_type IN ('points','zefir','coffee')),
  compensation_per_item INTEGER NOT NULL DEFAULT 1500 CHECK(compensation_per_item BETWEEN 1 AND 1000000000),
  compensation_total INTEGER NOT NULL DEFAULT 0 CHECK(compensation_total BETWEEN 0 AND 30000000000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','applied')),
  created_at INTEGER NOT NULL,
  applied_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_daily_loyalty_protection_grants_player
ON daily_loyalty_protection_grants(telegram_id,season_id,created_at DESC);

CREATE TABLE IF NOT EXISTS game_case_drop_settings (
  config_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  chance_bps INTEGER NOT NULL DEFAULT 700 CHECK(chance_bps BETWEEN 0 AND 10000),
  weight_small INTEGER NOT NULL DEFAULT 7000 CHECK(weight_small BETWEEN 0 AND 1000000),
  weight_sweet INTEGER NOT NULL DEFAULT 2200 CHECK(weight_sweet BETWEEN 0 AND 1000000),
  weight_gold INTEGER NOT NULL DEFAULT 600 CHECK(weight_gold BETWEEN 0 AND 1000000),
  weight_mythic INTEGER NOT NULL DEFAULT 200 CHECK(weight_mythic BETWEEN 0 AND 1000000),
  weight_legendary INTEGER NOT NULL DEFAULT 0 CHECK(weight_legendary BETWEEN 0 AND 1000000),
  spawn_min_ms INTEGER NOT NULL DEFAULT 10000 CHECK(spawn_min_ms BETWEEN 1000 AND 300000),
  spawn_max_ms INTEGER NOT NULL DEFAULT 35000 CHECK(spawn_max_ms BETWEEN 1000 AND 300000),
  updated_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO game_case_drop_settings
  (config_id,enabled,chance_bps,weight_small,weight_sweet,weight_gold,weight_mythic,weight_legendary,spawn_min_ms,spawn_max_ms,updated_at)
VALUES ('main',0,700,7000,2200,600,200,0,10000,35000,unixepoch());

CREATE TABLE IF NOT EXISTS game_run_case_drops (
  run_id TEXT PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  case_type TEXT NOT NULL CHECK(case_type IN ('small','sweet','gold','mythic','legendary')),
  spawn_after_ms INTEGER NOT NULL CHECK(spawn_after_ms BETWEEN 1000 AND 600000),
  caught INTEGER NOT NULL DEFAULT 0 CHECK(caught IN (0,1)),
  granted INTEGER NOT NULL DEFAULT 0 CHECK(granted IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_game_run_case_drops_player
ON game_run_case_drops(telegram_id,created_at DESC);

-- Rebuild the task definition table only to extend its metric CHECK with login_days.
-- No task rows are changed and the current live season does not receive new tasks automatically.
CREATE TABLE season_pass_tasks_v0079 (
  season_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  period TEXT NOT NULL CHECK(period IN ('daily','weekly')),
  premium INTEGER NOT NULL DEFAULT 0 CHECK(premium IN (0,1)),
  metric TEXT NOT NULL CHECK(metric IN ('runs','treats','coffee','score','cases_opened','login_days')),
  target INTEGER NOT NULL CHECK(target > 0),
  xp_reward INTEGER NOT NULL CHECK(xp_reward > 0),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(season_id, task_id)
);
INSERT INTO season_pass_tasks_v0079
  (season_id,task_id,period,premium,metric,target,xp_reward,title,description,enabled,sort_order,updated_at,updated_by)
SELECT season_id,task_id,period,premium,metric,target,xp_reward,title,description,enabled,sort_order,updated_at,updated_by
FROM season_pass_tasks;
DROP TABLE season_pass_tasks;
ALTER TABLE season_pass_tasks_v0079 RENAME TO season_pass_tasks;
CREATE INDEX IF NOT EXISTS idx_season_pass_tasks_enabled
ON season_pass_tasks(season_id,period,enabled,sort_order,task_id);
