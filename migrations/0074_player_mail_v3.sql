-- Player Mail V3: independent authoritative in-game mail storage.
CREATE TABLE IF NOT EXISTS player_mail_v3 (
  mail_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT NOT NULL DEFAULT '',
  mail_kind TEXT NOT NULL DEFAULT 'message',
  title TEXT NOT NULL DEFAULT '',
  preview_text TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  reward_state TEXT NOT NULL DEFAULT 'none',
  read_at INTEGER NOT NULL DEFAULT 0,
  claimed_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (mail_id, telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_player_mail_v3_player
  ON player_mail_v3 (telegram_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_mail_v3_unread
  ON player_mail_v3 (telegram_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_mail_v3_reward_state
  ON player_mail_v3 (telegram_id, reward_state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_mail_v3_source
  ON player_mail_v3 (source_type, source_id, telegram_id);

CREATE TABLE IF NOT EXISTS player_mail_rewards_v3 (
  mail_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  reward_index INTEGER NOT NULL,
  reward_kind TEXT NOT NULL DEFAULT '',
  reward_id TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL DEFAULT 1,
  reward_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (mail_id, telegram_id, reward_index)
);

CREATE INDEX IF NOT EXISTS idx_player_mail_rewards_v3_player
  ON player_mail_rewards_v3 (telegram_id, mail_id, reward_index);
