-- 5.1: рабочий центр сотрудников: интерактивная выдача, обращения,
-- управление сезоном, диагностика и ежедневные отчёты.

ALTER TABLE leaderboard_seasons
ADD COLUMN manual_override INTEGER NOT NULL DEFAULT 0 CHECK(manual_override IN (0, 1));

ALTER TABLE leaderboard_seasons
ADD COLUMN reward_title TEXT NOT NULL DEFAULT '';

ALTER TABLE leaderboard_seasons
ADD COLUMN reward_image_url TEXT NOT NULL DEFAULT '';

ALTER TABLE leaderboard_seasons
ADD COLUMN reward_item_id TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS bot_staff_workflows (
  telegram_id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  flow_type TEXT NOT NULL,
  step TEXT NOT NULL,
  data_json TEXT NOT NULL DEFAULT '{}',
  expires_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bot_staff_workflows_expiry
ON bot_staff_workflows(expires_at);

CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  player_telegram_id TEXT NOT NULL DEFAULT '',
  player_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'working', 'resolved', 'rejected')),
  assigned_to TEXT NOT NULL DEFAULT '',
  assigned_to_name TEXT NOT NULL DEFAULT '',
  resolution TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  closed_at INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status_updated
ON support_tickets(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_creator
ON support_tickets(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_player
ON support_tickets(player_telegram_id, created_at DESC);


CREATE TABLE IF NOT EXISTS player_admin_controls (
  telegram_id TEXT PRIMARY KEY,
  custom_name TEXT NOT NULL DEFAULT '',
  blocked INTEGER NOT NULL DEFAULT 0 CHECK(blocked IN (0, 1)),
  block_reason TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_player_admin_controls_blocked
ON player_admin_controls(blocked, updated_at DESC);

CREATE TABLE IF NOT EXISTS bot_system_state (
  state_key TEXT PRIMARY KEY,
  state_value TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);
