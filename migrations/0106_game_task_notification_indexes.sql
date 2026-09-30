-- Game Task Hub stage 3: keep notification cron reads indexed as history grows.
CREATE INDEX IF NOT EXISTS idx_player_game_tasks_completed
ON player_game_tasks(completed_at, kind, task_key);

CREATE INDEX IF NOT EXISTS idx_task_exposure_active
ON task_exposure_log(completed_at, last_seen_at DESC, chain_key);
