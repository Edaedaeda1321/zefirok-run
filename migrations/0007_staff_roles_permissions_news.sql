ALTER TABLE staff_users ADD COLUMN role TEXT NOT NULL DEFAULT 'employee';
ALTER TABLE staff_users ADD COLUMN can_redeem_rewards INTEGER NOT NULL DEFAULT 1;
ALTER TABLE staff_users ADD COLUMN can_adjust_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE staff_users ADD COLUMN can_manage_products INTEGER NOT NULL DEFAULT 0;
ALTER TABLE staff_users ADD COLUMN can_publish_news INTEGER NOT NULL DEFAULT 0;
ALTER TABLE staff_users ADD COLUMN can_manage_staff INTEGER NOT NULL DEFAULT 0;
ALTER TABLE staff_users ADD COLUMN invited_by TEXT;
ALTER TABLE staff_users ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;

ALTER TABLE admin_profile_state ADD COLUMN wallet_override INTEGER;

CREATE TABLE IF NOT EXISTS bot_news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  created_at INTEGER NOT NULL,
  published_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  created_by_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_bot_news_status_published
ON bot_news(status, published_at DESC);
