-- v0.79.3: server optimization.
-- Adds leased notification queues, a lightweight Cron scheduler, server analytics,
-- and targeted indexes for the production background/analytics queries.

ALTER TABLE leaderboard_staff_notifications
ADD COLUMN available_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leaderboard_staff_notifications
ADD COLUMN lease_token TEXT NOT NULL DEFAULT '';
ALTER TABLE leaderboard_staff_notifications
ADD COLUMN lease_until INTEGER NOT NULL DEFAULT 0;

ALTER TABLE player_notification_queue
ADD COLUMN lease_token TEXT NOT NULL DEFAULT '';
ALTER TABLE player_notification_queue
ADD COLUMN lease_until INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS server_cron_jobs (
  job_key TEXT PRIMARY KEY,
  interval_seconds INTEGER NOT NULL CHECK(interval_seconds >= 60),
  priority INTEGER NOT NULL DEFAULT 100,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
  next_run_at INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT NOT NULL DEFAULT '',
  lease_until INTEGER NOT NULL DEFAULT 0,
  last_started_at INTEGER NOT NULL DEFAULT 0,
  last_finished_at INTEGER NOT NULL DEFAULT 0,
  last_success_at INTEGER NOT NULL DEFAULT 0,
  last_duration_ms INTEGER NOT NULL DEFAULT 0,
  last_status TEXT NOT NULL DEFAULT 'never',
  last_error TEXT NOT NULL DEFAULT '',
  runs_total INTEGER NOT NULL DEFAULT 0,
  failures_total INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_server_cron_jobs_due
ON server_cron_jobs(enabled, next_run_at, lease_until, priority, job_key);

CREATE TABLE IF NOT EXISTS server_analytics_hourly (
  bucket_at INTEGER PRIMARY KEY,
  active_players INTEGER NOT NULL DEFAULT 0,
  new_players INTEGER NOT NULL DEFAULT 0,
  runs_total INTEGER NOT NULL DEFAULT 0,
  runs_accepted INTEGER NOT NULL DEFAULT 0,
  cases_opened INTEGER NOT NULL DEFAULT 0,
  shop_operations INTEGER NOT NULL DEFAULT 0,
  rewards_delivered INTEGER NOT NULL DEFAULT 0,
  rewards_failed INTEGER NOT NULL DEFAULT 0,
  staff_notifications_sent INTEGER NOT NULL DEFAULT 0,
  staff_notifications_failed INTEGER NOT NULL DEFAULT 0,
  player_notifications_sent INTEGER NOT NULL DEFAULT 0,
  player_notifications_failed INTEGER NOT NULL DEFAULT 0,
  cron_runs INTEGER NOT NULL DEFAULT 0,
  cron_failures INTEGER NOT NULL DEFAULT 0,
  cron_duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_server_analytics_hourly_recent
ON server_analytics_hourly(bucket_at DESC);

-- Due queue indexes are partial so sent/delivered history does not inflate the hot path.
CREATE INDEX IF NOT EXISTS idx_staff_notifications_due_v0793
ON leaderboard_staff_notifications(status, available_at, created_at, id, lease_until)
WHERE attempts < 5;

CREATE INDEX IF NOT EXISTS idx_player_notifications_due_v0793
ON player_notification_queue(status, available_at, id, lease_until)
WHERE attempts < 5;

CREATE INDEX IF NOT EXISTS idx_reward_delivery_due_v0793
ON reward_delivery_queue(status, available_at, created_at, id, lease_until)
WHERE attempts < 5;

CREATE INDEX IF NOT EXISTS idx_leaderboard_rewards_expiry_v0793
ON leaderboard_rewards(expires_at, id)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_player_notification_log_cleanup_v0793
ON player_notification_log(sent_at, id);

CREATE INDEX IF NOT EXISTS idx_performance_samples_analytics_v0793
ON admin_performance_samples(created_at, area, duration_ms, success);

CREATE INDEX IF NOT EXISTS idx_reward_delivery_analytics_v0793
ON reward_delivery_queue(status, updated_at, reward_kind);

CREATE INDEX IF NOT EXISTS idx_staff_notifications_analytics_v0793
ON leaderboard_staff_notifications(status, updated_at);

CREATE INDEX IF NOT EXISTS idx_player_notifications_analytics_v0793
ON player_notification_queue(status, updated_at);

CREATE INDEX IF NOT EXISTS idx_reward_codes_redeemed_v0793
ON reward_codes(redeemed_at)
WHERE status = 'used';

CREATE INDEX IF NOT EXISTS idx_task_claims_analytics_v0793
ON player_task_claims(chain_key, status, created_at);

CREATE INDEX IF NOT EXISTS idx_automation_chains_silent_v0793
ON automation_chains(updated_at, chain_key)
WHERE enabled = 1;

CREATE INDEX IF NOT EXISTS idx_smart_alerts_notify_v0793
ON smart_alert_events(last_notified_at, alert_key)
WHERE status = 'open' AND severity = 'critical';

CREATE INDEX IF NOT EXISTS idx_granted_cases_status_type_v0793
ON granted_cases(status, case_type, created_at);

CREATE INDEX IF NOT EXISTS idx_shop_consumptions_category_v0793
ON shop_stock_consumptions(created_at, category);

INSERT OR IGNORE INTO server_cron_jobs
(job_key, interval_seconds, priority, enabled, next_run_at, updated_at)
VALUES
('critical-queues', 60, 10, 1, 0, unixepoch()),
('liveops-minute', 60, 20, 1, 0, unixepoch()),
('health-five-minutes', 300, 30, 1, 0, unixepoch()),
('automations-five-minutes', 300, 40, 1, 0, unixepoch()),
('hourly-maintenance', 3600, 50, 1, 0, unixepoch()),
('daily-cleanup', 86400, 60, 1, 0, unixepoch());
