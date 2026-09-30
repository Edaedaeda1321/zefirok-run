-- Game Task Hub stage 3: contextual run goals + durable Telegram notice state.
-- run_booster_types_json snapshots every authoritative booster attached to the run
-- (including utility boosters) without changing the existing economy booster fields.
ALTER TABLE player_economy_run_ledger
ADD COLUMN run_booster_types_json TEXT;

-- Notification metadata only. Task completion/rewards remain authoritative in
-- player_game_tasks and claim/reward-delivery tables.
CREATE TABLE IF NOT EXISTS game_task_notification_state (
  telegram_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  task_key TEXT NOT NULL,
  cycle_key TEXT NOT NULL,
  completion_bot_at INTEGER NOT NULL DEFAULT 0,
  expiry_bot_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (telegram_id, kind, task_key, cycle_key)
);

CREATE INDEX IF NOT EXISTS idx_game_task_notification_state_updated
ON game_task_notification_state(updated_at);

-- Do not retroactively push historical task completions when Stage 3 is deployed.
-- Existing receipts are considered already notified; only receipts created after
-- this migration are eligible for the new important-only Telegram completion push.
INSERT OR IGNORE INTO game_task_notification_state(
  telegram_id, kind, task_key, cycle_key, completion_bot_at, expiry_bot_at, updated_at
)
SELECT telegram_id, kind, task_key, cycle_key,
       CASE WHEN completed_at > 0 THEN completed_at ELSE unixepoch() END,
       0,
       unixepoch()
FROM player_game_tasks
WHERE completed_at > 0;
