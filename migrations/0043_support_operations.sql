-- 1.0.6 Support Operations 1.0
-- Operational metadata for the existing Player Support Center / Bot Support 2.0.
-- Existing support_tickets, support_messages and support_attachments are preserved.

CREATE TABLE IF NOT EXISTS support_ticket_operations (
  ticket_id INTEGER PRIMARY KEY,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','important','critical')),
  priority_source TEXT NOT NULL DEFAULT 'auto' CHECK(priority_source IN ('auto','manual')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_operations_priority
ON support_ticket_operations(priority, updated_at DESC);

INSERT OR IGNORE INTO support_ticket_operations(
  ticket_id, priority, priority_source, created_at, updated_at, updated_by
)
SELECT id,
       CASE WHEN category IN ('purchase','reward','account','reward_missing','code_problem','item_missing','balance_problem') THEN 'important' ELSE 'normal' END,
       'auto', created_at, updated_at, 'migration-0043'
FROM support_tickets;

CREATE TABLE IF NOT EXISTS support_ticket_tags (
  ticket_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(ticket_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_tags_tag
ON support_ticket_tags(tag, ticket_id);

INSERT OR IGNORE INTO support_ticket_tags(ticket_id,tag,created_at,created_by)
SELECT id,
       CASE category
         WHEN 'bug' THEN 'bug'
         WHEN 'purchase' THEN 'purchase'
         WHEN 'reward' THEN 'reward'
         WHEN 'account' THEN 'account'
         WHEN 'suggestion' THEN 'idea'
         WHEN 'feedback' THEN 'feedback'
         WHEN 'reward_missing' THEN 'reward'
         WHEN 'code_problem' THEN 'code'
         WHEN 'item_missing' THEN 'reward'
         WHEN 'balance_problem' THEN 'account'
         WHEN 'rating_problem' THEN 'rating'
         ELSE 'other'
       END,
       created_at,
       'migration-0043'
FROM support_tickets;

CREATE TABLE IF NOT EXISTS support_internal_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  note_text TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_internal_notes_ticket
ON support_internal_notes(ticket_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS support_reply_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_support_reply_templates_active
ON support_reply_templates(active, sort_order, title);

INSERT OR IGNORE INTO support_reply_templates(template_key,title,body,active,sort_order,created_at,updated_at,updated_by) VALUES
('checking','Спасибо, проверяем','Спасибо за обращение. Мы получили информацию и проверяем ситуацию. Если понадобятся дополнительные данные, напишем в этом обращении.',1,10,unixepoch(),unixepoch(),'migration-0043'),
('need_details','Нужны дополнительные данные','Спасибо. Чтобы точнее разобраться, пожалуйста, пришлите дополнительные детали: что вы делали перед проблемой, что ожидали увидеть и, если возможно, скриншот.',1,20,unixepoch(),unixepoch(),'migration-0043'),
('known_issue','Проблема известна','Спасибо за сообщение. Мы уже знаем об этой проблеме и работаем над исправлением. Дополнительных действий с вашей стороны пока не требуется.',1,30,unixepoch(),unixepoch(),'migration-0043'),
('fixed','Проблема исправлена','Проблема исправлена. Пожалуйста, полностью закройте Mini App и откройте игру заново через Telegram-бота. Если ситуация повторится, ответьте в этом обращении.',1,40,unixepoch(),unixepoch(),'migration-0043'),
('compensation','Компенсация выдана','Мы проверили обращение и выдали компенсацию. Начисление появится в аккаунте автоматически. Спасибо, что сообщили о ситуации.',1,50,unixepoch(),unixepoch(),'migration-0043');

CREATE TABLE IF NOT EXISTS support_ticket_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  close_token TEXT NOT NULL,
  rating TEXT NOT NULL CHECK(rating IN ('up','down')),
  source TEXT NOT NULL DEFAULT 'bot' CHECK(source IN ('bot','game')),
  player_telegram_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  UNIQUE(ticket_id, close_token)
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_feedback_ticket
ON support_ticket_feedback(ticket_id, created_at DESC, id DESC);
