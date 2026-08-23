-- Player mail/inbox v1. Existing player_gift_inbox remains the authoritative reward envelope.
CREATE TABLE IF NOT EXISTS player_mail_metadata (
  gift_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  preview_text TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  read_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(gift_id, telegram_id)
);
CREATE INDEX IF NOT EXISTS idx_player_mail_metadata_unread
  ON player_mail_metadata(telegram_id, read_at, gift_id);

CREATE TABLE IF NOT EXISTS admin_campaign_mail_config (
  campaign_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  preview_text TEXT NOT NULL DEFAULT ''
);
