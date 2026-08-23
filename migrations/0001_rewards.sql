CREATE TABLE IF NOT EXISTS reward_codes (
  code TEXT PRIMARY KEY,
  code_compact TEXT NOT NULL UNIQUE,
  request_id TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  owner_telegram_id TEXT NOT NULL,
  owner_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  redeemed_at INTEGER,
  redeemed_by TEXT,
  redeemed_by_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_reward_codes_owner_created
ON reward_codes(owner_telegram_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reward_codes_status_expiry
ON reward_codes(status, expires_at);

CREATE TABLE IF NOT EXISTS staff_users (
  telegram_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  added_at INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
