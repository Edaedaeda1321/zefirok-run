-- v0.53: расширенная LiveOps-админ-панель, серьёзная модерация,
-- заметки, кампании, антифрод, история конфигурации и рабочие точки.

ALTER TABLE player_admin_controls
ADD COLUMN block_type TEXT NOT NULL DEFAULT 'permanent';

ALTER TABLE player_admin_controls
ADD COLUMN blocked_until INTEGER NOT NULL DEFAULT 0;

ALTER TABLE player_admin_controls
ADD COLUMN blocked_at INTEGER NOT NULL DEFAULT 0;

ALTER TABLE player_admin_controls
ADD COLUMN blocked_by_name TEXT NOT NULL DEFAULT '';

ALTER TABLE player_admin_controls
ADD COLUMN appeal_note TEXT NOT NULL DEFAULT '';

ALTER TABLE player_admin_controls
ADD COLUMN last_unblocked_at INTEGER NOT NULL DEFAULT 0;

ALTER TABLE player_admin_controls
ADD COLUMN last_unblocked_by TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS player_moderation_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('block', 'unblock', 'expire', 'appeal_note')),
  block_type TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  blocked_until INTEGER NOT NULL DEFAULT 0,
  actor_telegram_id TEXT NOT NULL DEFAULT '',
  actor_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_player_moderation_history_player
ON player_moderation_history(telegram_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_admin_controls_active_bans
ON player_admin_controls(blocked, blocked_until, updated_at DESC);

CREATE TABLE IF NOT EXISTS player_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  note_text TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  deleted_at INTEGER NOT NULL DEFAULT 0,
  deleted_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_player_notes_player
ON player_notes(telegram_id, deleted_at, created_at DESC);

CREATE TABLE IF NOT EXISTS liveops_content_items (
  item_kind TEXT NOT NULL CHECK(item_kind IN ('avatar', 'frame', 'trail', 'skin')),
  item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  weight REAL NOT NULL DEFAULT 1 CHECK(weight >= 0),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
  is_new INTEGER NOT NULL DEFAULT 0 CHECK(is_new IN (0, 1)),
  legendary_only INTEGER NOT NULL DEFAULT 0 CHECK(legendary_only IN (0, 1)),
  image_url TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(item_kind, item_id)
);

CREATE INDEX IF NOT EXISTS idx_liveops_content_kind_enabled
ON liveops_content_items(item_kind, enabled, rarity, title);

CREATE TABLE IF NOT EXISTS liveops_case_configs (
  case_id TEXT PRIMARY KEY CHECK(case_id IN ('small', 'sweet', 'gold', 'legendary')),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
  title TEXT NOT NULL,
  guarantee_count INTEGER NOT NULL DEFAULT 0 CHECK(guarantee_count >= 0),
  chances_json TEXT NOT NULL DEFAULT '{}',
  ranges_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS liveops_config_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_json TEXT NOT NULL DEFAULT '{}',
  new_json TEXT NOT NULL DEFAULT '{}',
  reason TEXT NOT NULL DEFAULT '',
  actor_telegram_id TEXT NOT NULL,
  actor_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_liveops_config_history_recent
ON liveops_config_history(created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_liveops_config_history_entity
ON liveops_config_history(entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_campaigns (
  campaign_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  segment_key TEXT NOT NULL,
  reward_kind TEXT NOT NULL,
  reward_id TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL DEFAULT 1 CHECK(amount >= 1),
  reason TEXT NOT NULL,
  message_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('draft', 'pending', 'running', 'completed', 'cancelled', 'failed')),
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  report_chat_id TEXT NOT NULL,
  total_count INTEGER NOT NULL DEFAULT 0,
  processed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  started_at INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  lease_token TEXT NOT NULL DEFAULT '',
  lease_until INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_admin_campaigns_pending
ON admin_campaigns(status, lease_until, created_at);

CREATE TABLE IF NOT EXISTS admin_campaign_recipients (
  campaign_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processed', 'failed', 'skipped')),
  error_text TEXT NOT NULL DEFAULT '',
  processed_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(campaign_id, telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_campaign_recipients_pending
ON admin_campaign_recipients(campaign_id, status, telegram_id);

CREATE TABLE IF NOT EXISTS fraud_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  assigned_to TEXT NOT NULL DEFAULT '',
  resolution TEXT NOT NULL DEFAULT '',
  fingerprint TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status_severity
ON fraud_alerts(status, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_player
ON fraud_alerts(telegram_id, created_at DESC);

CREATE TABLE IF NOT EXISTS staff_work_context (
  telegram_id TEXT PRIMARY KEY,
  location_name TEXT NOT NULL DEFAULT 'Основное кафе',
  shift_name TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS physical_redemption_context (
  reward_code TEXT PRIMARY KEY,
  employee_telegram_id TEXT NOT NULL,
  employee_name TEXT NOT NULL DEFAULT '',
  location_name TEXT NOT NULL DEFAULT 'Основное кафе',
  shift_name TEXT NOT NULL DEFAULT '',
  redeemed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_physical_redemption_context_location
ON physical_redemption_context(location_name, redeemed_at DESC);
