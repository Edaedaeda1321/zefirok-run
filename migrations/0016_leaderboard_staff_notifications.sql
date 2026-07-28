CREATE TABLE IF NOT EXISTS leaderboard_staff_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_key TEXT NOT NULL,
  recipient_telegram_id TEXT NOT NULL,
  message_html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0),
  last_error TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  sent_at INTEGER NOT NULL DEFAULT 0,
  UNIQUE(event_key, recipient_telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_staff_notifications_pending
ON leaderboard_staff_notifications(status, attempts, created_at, id);
