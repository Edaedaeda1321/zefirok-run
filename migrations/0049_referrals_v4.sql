-- Referral Program v4: opt-in Telegram notifications and richer social progression.

ALTER TABLE referral_program_config ADD COLUMN notifications_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE referral_program_config ADD COLUMN notifications_daily_cap INTEGER NOT NULL DEFAULT 2;

CREATE TABLE IF NOT EXISTS referral_notification_preferences (
  telegram_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS referral_telegram_notifications (
  event_key TEXT PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed')),
  created_at INTEGER NOT NULL,
  sent_at INTEGER NOT NULL DEFAULT 0,
  error_text TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_referral_notifications_player
  ON referral_telegram_notifications(telegram_id,status,created_at DESC);
