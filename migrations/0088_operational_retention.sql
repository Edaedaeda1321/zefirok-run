-- P2 operational retention: bounded detail windows + compact archives.
-- The Worker performs archive + delete in the same D1 batch so a retry cannot
-- double-count rollups or lose source rows.

CREATE TABLE IF NOT EXISTS operational_retention_state (
  policy_key TEXT PRIMARY KEY,
  detail_days INTEGER NOT NULL,
  archive_kind TEXT NOT NULL,
  cutoff_at INTEGER NOT NULL DEFAULT 0,
  rows_archived INTEGER NOT NULL DEFAULT 0,
  rows_deleted INTEGER NOT NULL DEFAULT 0,
  last_run_at INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS game_run_session_daily_archive (
  day_at INTEGER NOT NULL,
  status TEXT NOT NULL,
  season_id TEXT NOT NULL DEFAULT '',
  runs INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  run_treats INTEGER NOT NULL DEFAULT 0,
  run_coffee INTEGER NOT NULL DEFAULT 0,
  economy_points INTEGER NOT NULL DEFAULT 0,
  economy_treats INTEGER NOT NULL DEFAULT 0,
  economy_coffee INTEGER NOT NULL DEFAULT 0,
  profile_xp INTEGER NOT NULL DEFAULT 0,
  new_records INTEGER NOT NULL DEFAULT 0,
  accepted_rating INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day_at,status,season_id)
);
CREATE INDEX IF NOT EXISTS idx_game_run_session_archive_recent
ON game_run_session_daily_archive(day_at DESC,status,season_id);

CREATE TABLE IF NOT EXISTS game_run_proof_daily_archive (
  day_at INTEGER PRIMARY KEY,
  proofs INTEGER NOT NULL DEFAULT 0,
  seq_total INTEGER NOT NULL DEFAULT 0,
  seq_max INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  run_treats INTEGER NOT NULL DEFAULT 0,
  run_coffee INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS player_economy_run_daily_archive (
  day_at INTEGER NOT NULL,
  telegram_id TEXT NOT NULL,
  qualification_ms INTEGER NOT NULL DEFAULT 12000,
  runs INTEGER NOT NULL DEFAULT 0,
  qualifying_runs INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  treats INTEGER NOT NULL DEFAULT 0,
  coffee INTEGER NOT NULL DEFAULT 0,
  profile_xp INTEGER NOT NULL DEFAULT 0,
  raw_score INTEGER NOT NULL DEFAULT 0,
  raw_treats INTEGER NOT NULL DEFAULT 0,
  raw_coffee INTEGER NOT NULL DEFAULT 0,
  qualifying_raw_score INTEGER NOT NULL DEFAULT 0,
  qualifying_raw_treats INTEGER NOT NULL DEFAULT 0,
  qualifying_raw_coffee INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  new_records INTEGER NOT NULL DEFAULT 0,
  accepted_rating INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day_at,telegram_id)
);
CREATE INDEX IF NOT EXISTS idx_player_economy_run_archive_player
ON player_economy_run_daily_archive(telegram_id,day_at DESC);

CREATE TABLE IF NOT EXISTS admin_performance_hourly_archive (
  bucket_at INTEGER NOT NULL,
  area TEXT NOT NULL,
  samples INTEGER NOT NULL DEFAULT 0,
  total_duration_ms INTEGER NOT NULL DEFAULT 0,
  max_duration_ms INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(bucket_at,area)
);
CREATE INDEX IF NOT EXISTS idx_admin_perf_hourly_archive_recent
ON admin_performance_hourly_archive(bucket_at DESC,area);

CREATE TABLE IF NOT EXISTS admin_performance_daily_archive (
  day_at INTEGER NOT NULL,
  area TEXT NOT NULL,
  samples INTEGER NOT NULL DEFAULT 0,
  total_duration_ms INTEGER NOT NULL DEFAULT 0,
  max_duration_ms INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day_at,area)
);
CREATE INDEX IF NOT EXISTS idx_admin_perf_daily_archive_recent
ON admin_performance_daily_archive(day_at DESC,area);

CREATE TABLE IF NOT EXISTS server_analytics_daily_archive (
  day_at INTEGER PRIMARY KEY,
  peak_active_players INTEGER NOT NULL DEFAULT 0,
  active_player_hours INTEGER NOT NULL DEFAULT 0,
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
  cron_duration_ms INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS content_analytics_daily_archive (
  day_at INTEGER NOT NULL,
  item_kind TEXT NOT NULL,
  item_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT '',
  events INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day_at,item_kind,item_id,event_type,source_type)
);
CREATE INDEX IF NOT EXISTS idx_content_analytics_archive_item
ON content_analytics_daily_archive(item_kind,item_id,event_type,day_at DESC);

CREATE TABLE IF NOT EXISTS player_timeline_daily_archive (
  day_at INTEGER NOT NULL,
  telegram_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  events INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day_at,telegram_id,event_type)
);
CREATE INDEX IF NOT EXISTS idx_player_timeline_archive_player
ON player_timeline_daily_archive(telegram_id,day_at DESC,event_type);

-- Completed reward rows are heavy but their idempotency identity must survive.
-- This compact archive is intentionally not time-pruned automatically.
CREATE TABLE IF NOT EXISTS reward_delivery_archive (
  operation_id TEXT PRIMARY KEY,
  queue_id INTEGER NOT NULL,
  telegram_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  reward_kind TEXT NOT NULL,
  reward_id TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL DEFAULT 1,
  final_status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  completed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reward_delivery_archive_player
ON reward_delivery_archive(telegram_id,completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_delivery_archive_source
ON reward_delivery_archive(source_type,source_id,telegram_id);

-- Minimal per-run facts keep lifetime achievement de-duplication exact after the
-- wide economy ledger row is compacted into daily aggregates.
CREATE TABLE IF NOT EXISTS player_economy_run_fact_archive (
  run_id TEXT PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  qualification_ms INTEGER NOT NULL DEFAULT 12000,
  qualified INTEGER NOT NULL DEFAULT 0 CHECK(qualified IN (0,1)),
  raw_score INTEGER NOT NULL DEFAULT 0,
  raw_treats INTEGER NOT NULL DEFAULT 0,
  raw_coffee INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_player_economy_run_fact_player
ON player_economy_run_fact_archive(telegram_id,created_at DESC);

-- Retention scans are global oldest-first scans. Player-centric indexes do not
-- cover those hot maintenance paths, so keep dedicated cutoff indexes.
CREATE INDEX IF NOT EXISTS idx_game_run_sessions_retention
ON game_run_sessions(status,updated_at,run_id);
CREATE INDEX IF NOT EXISTS idx_game_run_live_proofs_retention
ON game_run_live_proofs(updated_at,run_id);
CREATE INDEX IF NOT EXISTS idx_player_economy_run_ledger_retention
ON player_economy_run_ledger(created_at,run_id);
CREATE INDEX IF NOT EXISTS idx_admin_performance_retention
ON admin_performance_samples(created_at,id);
CREATE INDEX IF NOT EXISTS idx_content_analytics_retention
ON content_analytics_events(created_at,id);
CREATE INDEX IF NOT EXISTS idx_player_timeline_retention
ON player_timeline_events(created_at,id);
CREATE INDEX IF NOT EXISTS idx_reward_delivery_retention
ON reward_delivery_queue(status,updated_at,id);

-- Queue detail may be compacted, but operation_id remains authoritative forever.
-- New Workers write operation_id directly; this BEFORE trigger makes the archive
-- participate in the same idempotency contract at the database boundary.
CREATE TRIGGER IF NOT EXISTS trg_reward_delivery_archive_idempotency
BEFORE INSERT ON reward_delivery_queue
WHEN NEW.operation_id <> '' AND EXISTS(
  SELECT 1 FROM reward_delivery_archive a WHERE a.operation_id=NEW.operation_id
)
BEGIN
  SELECT RAISE(IGNORE);
END;

-- Rolling deploy bridge for legacy Workers: migration 0087 fills operation_id in
-- an AFTER INSERT trigger. If that generated key is already archived, remove the
-- transient legacy row immediately.
CREATE TRIGGER IF NOT EXISTS trg_reward_delivery_archive_legacy_bridge
AFTER UPDATE OF operation_id ON reward_delivery_queue
WHEN NEW.operation_id <> '' AND EXISTS(
  SELECT 1 FROM reward_delivery_archive a WHERE a.operation_id=NEW.operation_id
)
BEGIN
  DELETE FROM reward_delivery_queue WHERE id=NEW.id;
END;

-- Notification delivery detail contains message bodies / recipient rows. Keep
-- recent detail for support investigations, then retain lightweight daily totals.
CREATE TABLE IF NOT EXISTS notification_delivery_daily_archive (
  day_at INTEGER NOT NULL,
  channel TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  deliveries INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day_at,channel,category,status)
);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_archive_recent
ON notification_delivery_daily_archive(day_at DESC,channel,status);
