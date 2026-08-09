-- Control Center v8.5: saved player segments and A/B experiments.
-- The Worker also self-heals these tables for safe rolling deploys.

CREATE TABLE IF NOT EXISTS saved_player_segments (
  segment_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  rules_json TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_saved_player_segments_enabled
ON saved_player_segments(enabled, updated_at DESC);

CREATE TABLE IF NOT EXISTS ab_experiments (
  experiment_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  flag_key TEXT NOT NULL,
  variant_percent INTEGER NOT NULL DEFAULT 50 CHECK(variant_percent BETWEEN 1 AND 99),
  primary_metric TEXT NOT NULL DEFAULT 'runs',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','running','paused','completed','cancelled')),
  starts_at INTEGER NOT NULL DEFAULT 0,
  ends_at INTEGER NOT NULL DEFAULT 0,
  baseline_mode TEXT NOT NULL DEFAULT 'all',
  baseline_rollout INTEGER NOT NULL DEFAULT 100,
  winner TEXT NOT NULL DEFAULT '' CHECK(winner IN ('','control','variant','inconclusive')),
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT '',
  completed_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_status
ON ab_experiments(status, updated_at DESC);

-- Extra hot-path indexes used by Player 360 and custom segments.
CREATE INDEX IF NOT EXISTS idx_player_notes_active_v85
ON player_notes(telegram_id, deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_player_v85
ON promo_redemptions(telegram_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_queue_player_recent_v85
ON reward_delivery_queue(telegram_id, created_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_player_v85
ON admin_campaign_recipients(telegram_id, status, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_player_recent_v85
ON fraud_alerts(telegram_id, created_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_player_recent_v85
ON support_tickets(player_telegram_id, updated_at DESC, status);

-- Hot indexes for fast Player 360 / segment rules / A/B analytics.
CREATE INDEX IF NOT EXISTS idx_runs_player_recent_v85
ON leaderboard_runs(telegram_id, created_at DESC, accepted);
CREATE INDEX IF NOT EXISTS idx_pass_players_player_recent_v85
ON season_pass_players(telegram_id, updated_at DESC);
