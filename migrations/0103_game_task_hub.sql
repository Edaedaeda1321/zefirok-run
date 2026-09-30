-- Game Task Hub: durable per-player task completion/read/reward snapshot.
-- Mirrors the runtime fallback schema in ensureV67Schema().
CREATE TABLE IF NOT EXISTS player_game_tasks (
  telegram_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  task_key TEXT NOT NULL,
  cycle_key TEXT NOT NULL,
  completed_at INTEGER NOT NULL DEFAULT 0,
  read_at INTEGER NOT NULL DEFAULT 0,
  reward_json TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(telegram_id,kind,task_key,cycle_key)
);
