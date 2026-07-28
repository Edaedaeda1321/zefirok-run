-- 5.1: база подписчиков Telegram-бота и безопасные массовые рассылки владельца.

CREATE TABLE IF NOT EXISTS bot_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL UNIQUE,
  chat_id TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  first_started_at INTEGER NOT NULL,
  last_started_at INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  last_error TEXT NOT NULL DEFAULT '',
  last_delivery_at INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bot_subscribers_active
ON bot_subscribers(active, id);

CREATE TABLE IF NOT EXISTS bot_broadcasts (
  broadcast_id TEXT PRIMARY KEY,
  message_text TEXT NOT NULL,
  created_by TEXT NOT NULL,
  report_chat_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed')),
  total_count INTEGER NOT NULL DEFAULT 0 CHECK(total_count >= 0),
  sent_count INTEGER NOT NULL DEFAULT 0 CHECK(sent_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK(failed_count >= 0),
  updated_at INTEGER NOT NULL,
  completed_at INTEGER NOT NULL DEFAULT 0,
  completion_notified INTEGER NOT NULL DEFAULT 0 CHECK(completion_notified IN (0, 1)),
  lease_token TEXT NOT NULL DEFAULT '',
  lease_until INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bot_broadcasts_pending
ON bot_broadcasts(status, lease_until, created_at);

CREATE TABLE IF NOT EXISTS bot_broadcast_deliveries (
  broadcast_id TEXT NOT NULL,
  subscriber_id INTEGER NOT NULL,
  telegram_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0),
  error_text TEXT NOT NULL DEFAULT '',
  attempted_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (broadcast_id, subscriber_id)
);

CREATE INDEX IF NOT EXISTS idx_bot_broadcast_deliveries_pending
ON bot_broadcast_deliveries(broadcast_id, status, subscriber_id);

-- Telegram не отдаёт боту полную историю старых /start. Поэтому переносим в список
-- всех уже известных пользователей игры; новые пользователи фиксируются при каждом /start.
INSERT OR IGNORE INTO bot_subscribers (
  telegram_id, chat_id, username, display_name,
  first_started_at, last_started_at, active, last_error, last_delivery_at
)
SELECT telegram_id, telegram_id, username, display_name,
       updated_at, updated_at, 1, '', 0
FROM leaderboard_all_time
WHERE telegram_id <> '';

INSERT OR IGNORE INTO bot_subscribers (
  telegram_id, chat_id, username, display_name,
  first_started_at, last_started_at, active, last_error, last_delivery_at
)
SELECT telegram_id, telegram_id, '', '',
       created_at, updated_at, 1, '', 0
FROM admin_profile_state
WHERE telegram_id <> '';

INSERT OR IGNORE INTO bot_subscribers (
  telegram_id, chat_id, username, display_name,
  first_started_at, last_started_at, active, last_error, last_delivery_at
)
SELECT telegram_id, telegram_id, '', '',
       created_at, updated_at, 1, '', 0
FROM case_player_state
WHERE telegram_id <> '';

INSERT OR IGNORE INTO bot_subscribers (
  telegram_id, chat_id, username, display_name,
  first_started_at, last_started_at, active, last_error, last_delivery_at
)
SELECT owner_telegram_id, owner_telegram_id, '', owner_name,
       MIN(created_at), MAX(created_at), 1, '', 0
FROM reward_codes
WHERE owner_telegram_id <> ''
GROUP BY owner_telegram_id, owner_name;

INSERT OR IGNORE INTO bot_subscribers (
  telegram_id, chat_id, username, display_name,
  first_started_at, last_started_at, active, last_error, last_delivery_at
)
SELECT telegram_id, telegram_id, '', display_name,
       added_at, added_at, active, '', 0
FROM staff_users
WHERE telegram_id <> '';
