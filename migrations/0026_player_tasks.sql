-- v0.71: задания игроков поверх автоматизаций и безопасное получение наград.

ALTER TABLE automation_chains ADD COLUMN show_as_task INTEGER NOT NULL DEFAULT 0;
ALTER TABLE automation_chains ADD COLUMN task_mode TEXT NOT NULL DEFAULT 'one_time';
ALTER TABLE automation_chains ADD COLUMN task_description TEXT NOT NULL DEFAULT '';
ALTER TABLE automation_chains ADD COLUMN task_starts_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE automation_chains ADD COLUMN task_ends_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE automation_chains ADD COLUMN task_sort INTEGER NOT NULL DEFAULT 100;

CREATE TABLE IF NOT EXISTS player_task_claims (
  claim_key TEXT PRIMARY KEY,
  chain_key TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  cycle_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  queue_id INTEGER NOT NULL DEFAULT 0,
  reward_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  claimed_at INTEGER NOT NULL DEFAULT 0,
  UNIQUE(chain_key, telegram_id, cycle_key)
);

CREATE INDEX IF NOT EXISTS idx_player_task_claims_player
ON player_task_claims(telegram_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_tasks_visible
ON automation_chains(enabled, show_as_task, task_sort, updated_at);
