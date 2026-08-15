-- Sweet Run 1.0.7 · Test Project 1.0
-- Fully isolated owner-only sandbox. No production player/economy rows are mutated by Test Project routes.

CREATE TABLE IF NOT EXISTS test_project_workspaces (
  owner_telegram_id TEXT PRIMARY KEY,
  state_json TEXT NOT NULL DEFAULT '{}',
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  snapshot_at INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS test_project_case_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_telegram_id TEXT NOT NULL,
  case_type TEXT NOT NULL,
  rewards_json TEXT NOT NULL DEFAULT '[]',
  points_delta INTEGER NOT NULL DEFAULT 0,
  treats_delta INTEGER NOT NULL DEFAULT 0,
  coffee_delta INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_test_project_case_runs_owner
ON test_project_case_runs(owner_telegram_id, created_at DESC, id DESC);
