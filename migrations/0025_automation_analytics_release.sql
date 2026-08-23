-- v0.67: автоматические цепочки, удержание, история настроек,
-- производительность, планировщик релизов и прогноз остатков.

CREATE TABLE IF NOT EXISTS automation_chains (
  chain_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0,
  trigger_type TEXT NOT NULL,
  trigger_value INTEGER NOT NULL DEFAULT 0,
  action_type TEXT NOT NULL,
  action_json TEXT NOT NULL DEFAULT '{}',
  cooldown_seconds INTEGER NOT NULL DEFAULT 0,
  last_run_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS automation_chain_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_key TEXT NOT NULL UNIQUE,
  chain_key TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_automation_executions_chain
ON automation_chain_executions(chain_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_executions_player
ON automation_chain_executions(telegram_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_setting_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_group TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  action TEXT NOT NULL,
  old_json TEXT NOT NULL DEFAULT '{}',
  new_json TEXT NOT NULL DEFAULT '{}',
  actor_telegram_id TEXT NOT NULL DEFAULT '',
  actor_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_setting_history_recent
ON admin_setting_history(created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_admin_setting_history_entity
ON admin_setting_history(setting_group, setting_key, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_performance_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  success INTEGER NOT NULL DEFAULT 1,
  error_text TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_performance_recent
ON admin_performance_samples(created_at DESC, area);

CREATE TABLE IF NOT EXISTS release_plans (
  release_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  report_chat_id TEXT NOT NULL DEFAULT '',
  current_step INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_release_plans_due
ON release_plans(status, starts_at, updated_at);

CREATE TABLE IF NOT EXISTS release_steps (
  release_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  offset_seconds INTEGER NOT NULL DEFAULT 0,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER NOT NULL DEFAULT 0,
  error_text TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(release_id, step_order)
);

CREATE TABLE IF NOT EXISTS stock_forecast_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope_key TEXT NOT NULL,
  remaining INTEGER NOT NULL,
  used_14d INTEGER NOT NULL DEFAULT 0,
  avg_daily REAL NOT NULL DEFAULT 0,
  days_left REAL NOT NULL DEFAULT 0,
  expected_7d INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ok',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_forecast_recent
ON stock_forecast_snapshots(scope_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_created_v67
ON admin_profile_state(created_at, telegram_id);

CREATE INDEX IF NOT EXISTS idx_profile_updated_v67
ON admin_profile_state(updated_at, telegram_id);

CREATE INDEX IF NOT EXISTS idx_runs_created_player_v67
ON leaderboard_runs(created_at, telegram_id, accepted);

CREATE INDEX IF NOT EXISTS idx_stock_scope_created_v67
ON shop_stock_consumptions(scope_key, created_at);
