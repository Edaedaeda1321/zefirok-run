-- v0.77: diagnostics, task series, calendar, feedback moderation,
-- notification policy, task/economy analytics, conflicts, bulk actions and smart alerts.

CREATE TABLE IF NOT EXISTS task_series (
  series_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0,
  completion_mode TEXT NOT NULL DEFAULT 'ordered',
  final_reward_json TEXT NOT NULL DEFAULT '{}',
  task_mode TEXT NOT NULL DEFAULT 'one_time',
  starts_at INTEGER NOT NULL DEFAULT 0,
  ends_at INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS task_series_steps (
  series_key TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  chain_key TEXT NOT NULL,
  PRIMARY KEY(series_key, step_order),
  UNIQUE(series_key, chain_key)
);
CREATE INDEX IF NOT EXISTS idx_task_series_steps_chain ON task_series_steps(chain_key, series_key);

CREATE TABLE IF NOT EXISTS player_task_series_claims (
  claim_key TEXT PRIMARY KEY,
  series_key TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  cycle_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  queue_id INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  claimed_at INTEGER NOT NULL DEFAULT 0,
  UNIQUE(series_key, telegram_id, cycle_key)
);
CREATE INDEX IF NOT EXISTS idx_task_series_claims_player ON player_task_series_claims(telegram_id, created_at DESC);

CREATE TABLE IF NOT EXISTS task_exposure_log (
  chain_key TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  cycle_key TEXT NOT NULL,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  progress_value INTEGER NOT NULL DEFAULT 0,
  target_value INTEGER NOT NULL DEFAULT 1,
  completed_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(chain_key, telegram_id, cycle_key)
);
CREATE INDEX IF NOT EXISTS idx_task_exposure_chain ON task_exposure_log(chain_key, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS poll_comment_moderation (
  poll_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  tag TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(poll_id, telegram_id)
);
CREATE INDEX IF NOT EXISTS idx_poll_comment_moderation_status ON poll_comment_moderation(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS player_notification_policy (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  paused INTEGER NOT NULL DEFAULT 0,
  max_per_day INTEGER NOT NULL DEFAULT 3,
  min_gap_seconds INTEGER NOT NULL DEFAULT 3600,
  quiet_start_hour INTEGER NOT NULL DEFAULT 22,
  quiet_end_hour INTEGER NOT NULL DEFAULT 9,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS player_notification_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  category TEXT NOT NULL,
  message_html TEXT NOT NULL,
  reply_markup_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  available_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_player_notification_queue_due ON player_notification_queue(status, available_at, id);

CREATE TABLE IF NOT EXISTS player_notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  category TEXT NOT NULL,
  sent_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_player_notification_log_player ON player_notification_log(telegram_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS smart_alert_events (
  alert_key TEXT PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  last_notified_at INTEGER NOT NULL DEFAULT 0,
  resolved_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_smart_alert_events_status ON smart_alert_events(status, severity, last_seen_at DESC);

INSERT OR IGNORE INTO player_notification_policy
  (id, paused, max_per_day, min_gap_seconds, quiet_start_hour, quiet_end_hour, updated_at, updated_by)
VALUES (1, 0, 3, 3600, 22, 9, unixepoch(), 'migration');
