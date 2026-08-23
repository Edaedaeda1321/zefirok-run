-- v0.56: безопасный центр управления LiveOps без новых деплоев.

CREATE TABLE IF NOT EXISTS liveops_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  base_json TEXT NOT NULL DEFAULT '{}',
  draft_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','publishing','published','discarded','failed')),
  validation_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER NOT NULL DEFAULT 0,
  published_by TEXT NOT NULL DEFAULT '',
  error_text TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_liveops_drafts_status
ON liveops_drafts(status, updated_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS liveops_events (
  event_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','active','completed','cancelled','failed')),
  draft_json TEXT NOT NULL DEFAULT '{}',
  published_json TEXT NOT NULL DEFAULT '{}',
  runtime_snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER NOT NULL DEFAULT 0,
  start_notified INTEGER NOT NULL DEFAULT 0 CHECK(start_notified IN (0,1)),
  end_notified INTEGER NOT NULL DEFAULT 0 CHECK(end_notified IN (0,1)),
  last_error TEXT NOT NULL DEFAULT '',
  lease_token TEXT NOT NULL DEFAULT '',
  lease_until INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_liveops_events_schedule
ON liveops_events(status, starts_at, ends_at, lease_until);

CREATE TABLE IF NOT EXISTS reward_delivery_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL DEFAULT '',
  reward_kind TEXT NOT NULL,
  reward_id TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL DEFAULT 1 CHECK(amount >= 1),
  reason TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','delivering','delivered','claimed','failed','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  available_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  delivered_at INTEGER NOT NULL DEFAULT 0,
  claimed_at INTEGER NOT NULL DEFAULT 0,
  notify_after INTEGER NOT NULL DEFAULT 0,
  report_chat_id TEXT NOT NULL DEFAULT '',
  lease_token TEXT NOT NULL DEFAULT '',
  lease_until INTEGER NOT NULL DEFAULT 0,
  UNIQUE(source_type, source_id, telegram_id, reward_kind, reward_id)
);

CREATE INDEX IF NOT EXISTS idx_reward_delivery_queue_pending
ON reward_delivery_queue(status, available_at, lease_until, created_at);

CREATE INDEX IF NOT EXISTS idx_reward_delivery_queue_player
ON reward_delivery_queue(telegram_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS compensation_templates (
  template_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  rewards_json TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  owner_editable INTEGER NOT NULL DEFAULT 1 CHECK(owner_editable IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO compensation_templates(template_id,title,description,rewards_json,enabled,owner_editable,created_at,updated_at,updated_by) VALUES
('small','Маленькая компенсация','500 очков','[{"kind":"points","amount":500}]',1,1,unixepoch(),unixepoch(),'migration'),
('medium','Средняя компенсация','1 000 очков и Обычный кейс','[{"kind":"points","amount":1000},{"kind":"case","id":"small","amount":1}]',1,1,unixepoch(),unixepoch(),'migration'),
('large','Большая компенсация','2 500 очков и Золотой кейс','[{"kind":"points","amount":2500},{"kind":"case","id":"gold","amount":1}]',1,1,unixepoch(),unixepoch(),'migration'),
('rating_failure','Сбой рейтинга','Легендарный кейс','[{"kind":"case","id":"legendary","amount":1}]',1,1,unixepoch(),unixepoch(),'migration'),
('physical_error','Ошибка физической награды','Повторная доставка кода/ручная проверка','[{"kind":"physical_restore","amount":1}]',1,1,unixepoch(),unixepoch(),'migration');

CREATE TABLE IF NOT EXISTS integrity_check_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL,
  result_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
