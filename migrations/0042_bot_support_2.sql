-- 1.0.6 Bot Support 2.0
-- Keeps support_ticket_meta.source compatible with 0041 and records the actual entry channel separately.

CREATE TABLE IF NOT EXISTS support_ticket_channels (
  ticket_id INTEGER PRIMARY KEY,
  channel TEXT NOT NULL DEFAULT 'game' CHECK(channel IN ('game','bot','staff')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_channels_channel_updated
ON support_ticket_channels(channel, updated_at DESC);

INSERT OR IGNORE INTO support_ticket_channels(ticket_id,channel,created_at,updated_at)
SELECT m.ticket_id,
       CASE WHEN m.source='staff' THEN 'staff' ELSE 'game' END,
       m.created_at,
       m.updated_at
FROM support_ticket_meta m;

CREATE TABLE IF NOT EXISTS bot_player_support_workflows (
  telegram_id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  step TEXT NOT NULL,
  data_json TEXT NOT NULL DEFAULT '{}',
  expires_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bot_player_support_workflows_expiry
ON bot_player_support_workflows(expires_at);
