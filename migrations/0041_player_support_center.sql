-- 1.0.6 Player Support Center
-- Extends the existing support_tickets system without replacing staff-created tickets.

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

CREATE TABLE IF NOT EXISTS support_ticket_meta (
  ticket_id INTEGER PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'staff' CHECK(source IN ('staff','player')),
  subject TEXT NOT NULL DEFAULT '',
  request_id TEXT UNIQUE,
  client_json TEXT NOT NULL DEFAULT '{}',
  player_last_read_at INTEGER NOT NULL DEFAULT 0,
  staff_last_read_at INTEGER NOT NULL DEFAULT 0,
  last_player_message_at INTEGER NOT NULL DEFAULT 0,
  last_staff_message_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_meta_source_updated
ON support_ticket_meta(source, updated_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  author_kind TEXT NOT NULL CHECK(author_kind IN ('player','staff','system')),
  author_telegram_id TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  message_text TEXT NOT NULL DEFAULT '',
  request_id TEXT,
  client_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  telegram_delivered_at INTEGER NOT NULL DEFAULT 0,
  telegram_error TEXT NOT NULL DEFAULT '',
  UNIQUE(ticket_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_created
ON support_messages(ticket_id, created_at ASC, id ASC);

CREATE TABLE IF NOT EXISTS support_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  message_id INTEGER NOT NULL DEFAULT 0,
  uploader_kind TEXT NOT NULL DEFAULT 'player' CHECK(uploader_kind IN ('player','staff')),
  mime_type TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  size_bytes INTEGER NOT NULL DEFAULT 0 CHECK(size_bytes >= 0),
  telegram_file_id TEXT NOT NULL DEFAULT '',
  telegram_file_unique_id TEXT NOT NULL DEFAULT '',
  telegram_message_id INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','uploaded','failed')),
  error_text TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_attachments_ticket
ON support_attachments(ticket_id, created_at ASC, id ASC);

-- Preserve older staff-created tickets in the new conversation model.
INSERT OR IGNORE INTO support_ticket_meta (
  ticket_id, source, subject, request_id, client_json,
  player_last_read_at, staff_last_read_at,
  last_player_message_at, last_staff_message_at,
  created_at, updated_at
)
SELECT id, 'staff', '', NULL, '{}', 0, 0, 0, created_at, created_at, updated_at
FROM support_tickets;

INSERT OR IGNORE INTO support_messages (
  ticket_id, author_kind, author_telegram_id, author_name,
  message_text, request_id, client_json, created_at,
  telegram_delivered_at, telegram_error
)
SELECT t.id, 'staff', t.created_by, t.created_by_name,
       t.description, 'legacy-initial', '{}', t.created_at, 0, ''
FROM support_tickets t
JOIN support_ticket_meta m ON m.ticket_id = t.id
WHERE m.source = 'staff'
  AND TRIM(COALESCE(t.description,'')) <> '';
