-- v0.79.39: production prices, server tasks, run pickup metrics and reward-claim grace period.

-- The optional columns claim_grace_ends_at, run_treats and run_coffee are
-- added conditionally by Worker runtime after PRAGMA table_info checks.
-- Keeping ALTER TABLE out of the migration makes deployment safe even when
-- Git-based Worker deployment and D1 migration happen in either order.

CREATE TABLE IF NOT EXISTS season_pass_activity_runs (
  run_id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  run_treats INTEGER NOT NULL DEFAULT 0,
  run_coffee INTEGER NOT NULL DEFAULT 0,
  new_record INTEGER NOT NULL DEFAULT 0 CHECK(new_record IN (0,1)),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_season_pass_activity_player
ON season_pass_activity_runs(season_id, telegram_id, created_at);

CREATE TABLE IF NOT EXISTS season_pass_tasks (
  season_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  period TEXT NOT NULL CHECK(period IN ('daily','weekly')),
  premium INTEGER NOT NULL DEFAULT 0 CHECK(premium IN (0,1)),
  metric TEXT NOT NULL CHECK(metric IN ('runs','treats','coffee','score','cases_opened')),
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
CREATE INDEX IF NOT EXISTS idx_season_pass_tasks_enabled
ON season_pass_tasks(season_id, period, enabled, sort_order, task_id);

CREATE TABLE IF NOT EXISTS season_pass_task_claims (
  season_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  period_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','delivered','failed')),
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  claimed_at INTEGER NOT NULL,
  delivered_at INTEGER NOT NULL DEFAULT 0,
  error_text TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(season_id, telegram_id, task_id, period_key)
);
CREATE INDEX IF NOT EXISTS idx_season_pass_task_claims_player
ON season_pass_task_claims(season_id, telegram_id, status, claimed_at DESC);

CREATE TABLE IF NOT EXISTS season_pass_purchase_guards (
  guard_id TEXT PRIMARY KEY,
  ok INTEGER NOT NULL CHECK(ok = 1)
);

UPDATE season_pass_seasons
SET level_price_points = 10000,
    elite_price_points = 25000,
    elite_price_treats = 450,
    elite_price_coffee = 450,
    elite_plus_price_points = 50000,
    elite_plus_price_treats = 650,
    elite_plus_price_coffee = 650,
    updated_at = unixepoch(),
    updated_by = 'migration-0035'
WHERE season_id = 'season-1-cafe-opening';

INSERT OR REPLACE INTO season_pass_tasks
(season_id,task_id,period,premium,metric,target,xp_reward,title,description,enabled,sort_order,updated_at,updated_by)
VALUES
('season-1-cafe-opening','d_run_1','daily',0,'runs',1,180,'Заверши 1 забег','Засчитывается любой принятый сервером забег.',1,10,unixepoch(),'migration-0035'),
('season-1-cafe-opening','d_marsh_20','daily',0,'treats',20,140,'Собери 20 зефирок','Зефир суммируется по завершённым забегам.',1,20,unixepoch(),'migration-0035'),
('season-1-cafe-opening','d_coffee_5','daily',0,'coffee',5,160,'Собери 5 кофе','Кофе суммируется по завершённым забегам.',1,30,unixepoch(),'migration-0035'),
('season-1-cafe-opening','d_points_3000','daily',0,'score',3000,200,'Набери 3 000 очков','Очки складываются со всех принятых забегов за день.',1,40,unixepoch(),'migration-0035'),
('season-1-cafe-opening','d_p_run_3','daily',1,'runs',3,280,'Заверши 3 забега','Премиальное ежедневное задание.',1,50,unixepoch(),'migration-0035'),
('season-1-cafe-opening','d_p_marsh_50','daily',1,'treats',50,250,'Собери 50 зефирок','Премиальное ежедневное задание.',1,60,unixepoch(),'migration-0035'),
('season-1-cafe-opening','w_run_15','weekly',0,'runs',15,800,'Заверши 15 забегов','Недельная цель для постоянных игроков.',1,110,unixepoch(),'migration-0035'),
('season-1-cafe-opening','w_marsh_250','weekly',0,'treats',250,750,'Собери 250 зефирок','Зефир суммируется за текущую неделю.',1,120,unixepoch(),'migration-0035'),
('season-1-cafe-opening','w_coffee_40','weekly',0,'coffee',40,700,'Собери 40 кофе','Кофе суммируется за текущую неделю.',1,130,unixepoch(),'migration-0035'),
('season-1-cafe-opening','w_points_50000','weekly',0,'score',50000,900,'Набери 50 000 очков','Очки складываются со всех принятых забегов недели.',1,140,unixepoch(),'migration-0035'),
('season-1-cafe-opening','w_p_run_25','weekly',1,'runs',25,1200,'Заверши 25 забегов','Премиальная недельная цель.',1,150,unixepoch(),'migration-0035'),
('season-1-cafe-opening','w_p_cases_3','weekly',1,'cases_opened',3,1100,'Открой 3 кейса','Подойдут кейсы любого качества.',1,160,unixepoch(),'migration-0035');
