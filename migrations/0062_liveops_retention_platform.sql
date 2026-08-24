-- LiveOps retention platform v2.
-- Extends existing events, automations, referrals, startup and analytics without
-- replacing their authoritative reward/economy flows.

CREATE TABLE IF NOT EXISTS automation_mail_deliveries (
  execution_key TEXT PRIMARY KEY,
  chain_key TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  gift_id TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_automation_mail_chain
  ON automation_mail_deliveries(chain_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_mail_player
  ON automation_mail_deliveries(telegram_id, created_at DESC);

CREATE TABLE IF NOT EXISTS friend_coop_task_config (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  task_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT 'Вместе вкуснее',
  description TEXT NOT NULL DEFAULT 'Выполняйте цель вместе с другом.',
  metric TEXT NOT NULL DEFAULT 'runs',
  target_value INTEGER NOT NULL DEFAULT 6,
  reward_json TEXT NOT NULL DEFAULT '{"kind":"case","id":"small","amount":1}',
  starts_at INTEGER NOT NULL DEFAULT 0,
  ends_at INTEGER NOT NULL DEFAULT 0,
  cycle_started_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO friend_coop_task_config(
  id,task_key,enabled,title,description,metric,target_value,reward_json,starts_at,ends_at,cycle_started_at,updated_at,updated_by
) VALUES(
  1,'coop_default',0,'Вместе вкуснее','Сделайте 6 зачтённых забегов на двоих.','runs',6,
  '{"kind":"case","id":"small","amount":1}',0,0,strftime('%s','now'),strftime('%s','now'),'migration-0062'
);

CREATE TABLE IF NOT EXISTS friend_coop_claims (
  task_key TEXT NOT NULL,
  pair_key TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  queue_id INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  claimed_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(task_key, pair_key, telegram_id)
);
CREATE INDEX IF NOT EXISTS idx_friend_coop_claims_player
  ON friend_coop_claims(telegram_id, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_coop_claims_task
  ON friend_coop_claims(task_key, claimed_at DESC);

CREATE TABLE IF NOT EXISTS newcomer_path_steps (
  step_day INTEGER PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  runs_required INTEGER NOT NULL DEFAULT 1,
  cta_type TEXT NOT NULL DEFAULT 'game',
  reward_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO newcomer_path_steps(step_day,enabled,title,description,runs_required,cta_type,reward_json,updated_at,updated_by) VALUES
  (1,1,'Первый сладкий забег','Заверши первый полноценный забег и забери стартовый подарок.',1,'game','{"kind":"points","amount":500}',0,'migration-0062'),
  (2,1,'Загляни в коллекцию','Вернись на второй день, сделай ещё один забег и познакомься с кейсами и Альбомом.',2,'album','{"kind":"zefir","amount":20}',0,'migration-0062'),
  (3,1,'Играть вместе веселее','На третий день сделай ещё один забег и открой «Друзья кафе».',3,'referrals','{"kind":"case","id":"small","amount":1}',0,'migration-0062');

CREATE TABLE IF NOT EXISTS newcomer_path_claims (
  telegram_id TEXT NOT NULL,
  step_day INTEGER NOT NULL,
  queue_id INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  claimed_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(telegram_id, step_day)
);
CREATE INDEX IF NOT EXISTS idx_newcomer_claims_day
  ON newcomer_path_claims(step_day, claimed_at DESC);
