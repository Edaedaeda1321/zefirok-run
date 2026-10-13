-- Shared Zeffi story projects in the EXISTING zefirok-rewards D1.
-- No changes to personal cities, inventories or existing profile balances.
-- All real contributions require signed tester auth and independent server flags.
CREATE TABLE IF NOT EXISTS zeffi_community_projects (
  project_id TEXT PRIMARY KEY NOT NULL CHECK (project_id IN ('garden','festival')),
  goal_points INTEGER NOT NULL CHECK (goal_points > 0),
  total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0 AND total_points <= goal_points),
  stage INTEGER NOT NULL DEFAULT 0 CHECK (stage >= 0 AND stage <= 3),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  last_request_id TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT 0 CHECK (updated_at >= 0),
  CHECK ((project_id = 'garden' AND goal_points = 1000000 AND
          stage = CASE WHEN total_points >= 1000000 THEN 1 ELSE 0 END)
      OR (project_id = 'festival' AND goal_points = 50000000 AND
          stage = CASE WHEN total_points >= 50000000 THEN 3
                       WHEN total_points >= 30000000 THEN 2
                       WHEN total_points >= 12500000 THEN 1 ELSE 0 END))
);
INSERT OR IGNORE INTO zeffi_community_projects
 (project_id,goal_points,total_points,stage,revision,last_request_id,updated_at) VALUES
 ('garden',1000000,0,0,0,'',0),('festival',50000000,0,0,0,'',0);

CREATE TABLE IF NOT EXISTS zeffi_community_contributions (
  telegram_id TEXT NOT NULL,
  request_id TEXT NOT NULL CHECK (length(request_id) BETWEEN 12 AND 90),
  project_id TEXT NOT NULL REFERENCES zeffi_community_projects(project_id),
  requested_points INTEGER NOT NULL CHECK (requested_points > 0 AND requested_points <= 2000000),
  amount_points INTEGER NOT NULL CHECK (amount_points > 0 AND amount_points <= requested_points),
  project_revision INTEGER NOT NULL CHECK (project_revision > 0),
  created_at INTEGER NOT NULL CHECK (created_at > 0),
  project_guard INTEGER NOT NULL CHECK (project_guard = 1),
  wallet_guard INTEGER NOT NULL CHECK (wallet_guard = 1),
  PRIMARY KEY (telegram_id,request_id)
);
CREATE INDEX IF NOT EXISTS idx_zeffi_community_contributions_project_time
 ON zeffi_community_contributions(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zeffi_community_contributions_player
 ON zeffi_community_contributions(telegram_id,project_id);
