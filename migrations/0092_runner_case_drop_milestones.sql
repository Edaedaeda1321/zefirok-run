-- v0.92: support independent runner-case rolls at every 1,000 score milestone.
-- The legacy game_run_case_drops table remains in place for active runs that
-- started before this Worker version; the Worker imports that one legacy row
-- into milestone 1,000 on first checkpoint/settlement.
CREATE TABLE IF NOT EXISTS game_run_case_drop_milestones (
  run_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  milestone_score INTEGER NOT NULL CHECK(milestone_score >= 1000 AND milestone_score % 1000 = 0),
  case_type TEXT NOT NULL DEFAULT '' CHECK(case_type IN ('','small','sweet','gold','mythic','legendary')),
  spawn_after_ms INTEGER NOT NULL DEFAULT 0 CHECK(spawn_after_ms BETWEEN 0 AND 7200000),
  caught INTEGER NOT NULL DEFAULT 0 CHECK(caught IN (0,1)),
  granted INTEGER NOT NULL DEFAULT 0 CHECK(granted IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(run_id, milestone_score)
);

CREATE INDEX IF NOT EXISTS idx_game_run_case_drop_milestones_player
ON game_run_case_drop_milestones(telegram_id, created_at DESC);
