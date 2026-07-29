-- v0.65: staff limits, feature flags, cached admin overview and publication center support.

CREATE TABLE IF NOT EXISTS staff_action_limits (
  telegram_id TEXT PRIMARY KEY,
  points_per_player INTEGER NOT NULL DEFAULT 10000,
  points_daily INTEGER NOT NULL DEFAULT 100000,
  cases_daily INTEGER NOT NULL DEFAULT 20,
  legendary_daily INTEGER NOT NULL DEFAULT 2,
  campaigns_daily INTEGER NOT NULL DEFAULT 2,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS staff_action_usage (
  telegram_id TEXT NOT NULL,
  day_key TEXT NOT NULL,
  metric TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (telegram_id, day_key, metric)
);
CREATE INDEX IF NOT EXISTS idx_staff_action_usage_day ON staff_action_usage(day_key, metric, amount DESC);

CREATE TABLE IF NOT EXISTS live_feature_flags (
  flag_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'all' CHECK(mode IN ('off','testers','percent','all')),
  rollout_percent INTEGER NOT NULL DEFAULT 100 CHECK(rollout_percent BETWEEN 0 AND 100),
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO live_feature_flags(flag_key,title,description,mode,rollout_percent,updated_at,updated_by) VALUES
('cases','Кейсы','Открытие, покупка и активация кейсов','all',100,unixepoch(),'migration'),
('rating','Рейтинг','Отправка результатов и получение сезонной награды','all',100,unixepoch(),'migration'),
('shop','Покупки','Покупки скинов и кейсов','all',100,unixepoch(),'migration'),
('promocodes','Промокоды','Активация промокодов игроками','all',100,unixepoch(),'migration'),
('physical_rewards','Физические награды','Создание и выдача физических наград','all',100,unixepoch(),'migration');

CREATE TABLE IF NOT EXISTS admin_publication_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  draft_ids_json TEXT NOT NULL DEFAULT '[]',
  validation_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER NOT NULL DEFAULT 0,
  published_by TEXT NOT NULL DEFAULT '',
  error_text TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_admin_publication_batches_status ON admin_publication_batches(status, updated_at DESC);

-- Indexes for the cached admin overview. They keep the once-per-minute refresh
-- inexpensive as the production tables grow.
CREATE INDEX IF NOT EXISTS idx_leaderboard_runs_overview
ON leaderboard_runs(created_at, accepted, telegram_id);

CREATE INDEX IF NOT EXISTS idx_admin_profile_state_created
ON admin_profile_state(created_at);

CREATE INDEX IF NOT EXISTS idx_level_case_openings_overview
ON level_case_openings(opened_at);

CREATE INDEX IF NOT EXISTS idx_granted_cases_opened
ON granted_cases(opened_at);

CREATE INDEX IF NOT EXISTS idx_shop_stock_consumptions_created
ON shop_stock_consumptions(created_at);

CREATE INDEX IF NOT EXISTS idx_reward_delivery_queue_status_created
ON reward_delivery_queue(status, created_at);

CREATE INDEX IF NOT EXISTS idx_staff_action_log_errors
ON staff_action_log(success, created_at);
