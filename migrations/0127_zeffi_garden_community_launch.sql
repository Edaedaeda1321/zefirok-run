-- Launch the Meeting Garden as the first small-community funded project.
-- Preserve all contributions, player wallets, story state and project revisions.
-- If historic Garden contributions already exceed 60,000 points, the new CHECK
-- aborts this migration rather than silently discarding or rewriting payments.
-- D1 migration batches run transactionally; deferral preserves child FKs while
-- the community project table is recreated with the new immutable goal.
PRAGMA defer_foreign_keys=ON;
CREATE TABLE zeffi_community_projects_launch (
  project_id TEXT PRIMARY KEY NOT NULL CHECK (project_id IN ('garden','festival')),
  goal_points INTEGER NOT NULL CHECK (goal_points > 0),
  total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0 AND total_points <= goal_points),
  stage INTEGER NOT NULL DEFAULT 0 CHECK (stage >= 0 AND stage <= 3),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  last_request_id TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT 0 CHECK (updated_at >= 0),
  CHECK ((project_id = 'garden' AND goal_points = 60000 AND
          stage = CASE WHEN total_points >= 60000 THEN 1 ELSE 0 END)
      OR (project_id = 'festival' AND goal_points = 50000000 AND
          stage = CASE WHEN total_points >= 50000000 THEN 3
                       WHEN total_points >= 30000000 THEN 2
                       WHEN total_points >= 12500000 THEN 1 ELSE 0 END))
);
INSERT INTO zeffi_community_projects_launch
 (project_id,goal_points,total_points,stage,revision,last_request_id,updated_at)
 SELECT project_id,CASE WHEN project_id='garden' THEN 60000 ELSE goal_points END,
        total_points,CASE WHEN project_id='garden' THEN CASE WHEN total_points>=60000 THEN 1 ELSE 0 END ELSE stage END,
        revision,last_request_id,updated_at
 FROM zeffi_community_projects;
-- Rehome BOTH FK children before replacing the parent: merely dropping the
-- parent with deferred FKs leaves an unresolved SQLite constraint at COMMIT.
-- Full copies preserve prior per-player receipts, requestId uniqueness and
-- story event publication state, including paused events.
CREATE TABLE zeffi_community_contributions_launch (
  telegram_id TEXT NOT NULL,
  request_id TEXT NOT NULL CHECK (length(request_id) BETWEEN 12 AND 90),
  project_id TEXT NOT NULL REFERENCES zeffi_community_projects_launch(project_id),
  requested_points INTEGER NOT NULL CHECK (requested_points > 0 AND requested_points <= 2000000),
  amount_points INTEGER NOT NULL CHECK (amount_points > 0 AND amount_points <= requested_points),
  project_revision INTEGER NOT NULL CHECK (project_revision > 0),
  created_at INTEGER NOT NULL CHECK (created_at > 0),
  project_guard INTEGER NOT NULL CHECK (project_guard = 1),
  wallet_guard INTEGER NOT NULL CHECK (wallet_guard = 1),
  PRIMARY KEY (telegram_id,request_id)
);
INSERT INTO zeffi_community_contributions_launch
 SELECT * FROM zeffi_community_contributions;
CREATE TABLE zeffi_story_events_launch (
  event_id TEXT PRIMARY KEY NOT NULL CHECK (event_id IN ('garden','festival')),
  project_id TEXT NOT NULL UNIQUE REFERENCES zeffi_community_projects_launch(project_id),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  updated_at INTEGER NOT NULL DEFAULT 0 CHECK (updated_at >= 0)
);
INSERT INTO zeffi_story_events_launch SELECT * FROM zeffi_story_events;
DROP TABLE zeffi_community_contributions;
DROP TABLE zeffi_story_events;
DROP TABLE zeffi_community_projects;
ALTER TABLE zeffi_community_projects_launch RENAME TO zeffi_community_projects;
ALTER TABLE zeffi_community_contributions_launch RENAME TO zeffi_community_contributions;
ALTER TABLE zeffi_story_events_launch RENAME TO zeffi_story_events;
CREATE INDEX idx_zeffi_community_contributions_project_time
 ON zeffi_community_contributions(project_id,created_at DESC);
CREATE INDEX idx_zeffi_community_contributions_player
 ON zeffi_community_contributions(telegram_id,project_id);
PRAGMA foreign_key_check;
