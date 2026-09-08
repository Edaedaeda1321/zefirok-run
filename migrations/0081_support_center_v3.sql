-- Sweet Run 1.2.1 - Support Center 3.0
-- Adds workflow states and public known-issue tracking without changing the legacy
-- support_tickets.status CHECK, so existing bot/staff/player flows remain compatible.

CREATE TABLE IF NOT EXISTS support_ticket_workflow (
  ticket_id INTEGER PRIMARY KEY,
  workflow_state TEXT NOT NULL DEFAULT 'new' CHECK(workflow_state IN (
    'new','working','waiting_player','player_replied','known_issue','waiting_fix','resolved','rejected'
  )),
  known_issue_id INTEGER NOT NULL DEFAULT 0,
  last_transition_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_workflow_state_updated
ON support_ticket_workflow(workflow_state, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_ticket_workflow_issue
ON support_ticket_workflow(known_issue_id, workflow_state, updated_at DESC);

INSERT OR IGNORE INTO support_ticket_workflow(
  ticket_id, workflow_state, known_issue_id, last_transition_at, updated_at, updated_by
)
SELECT id,
       CASE status
         WHEN 'working' THEN 'working'
         WHEN 'resolved' THEN 'resolved'
         WHEN 'rejected' THEN 'rejected'
         ELSE 'new'
       END,
       0,
       updated_at,
       updated_at,
       'migration-0081'
FROM support_tickets;


-- Bring older automatically-prioritized support tickets in line with the new categories.
UPDATE support_ticket_operations
SET priority = 'important',
    updated_at = CASE WHEN updated_at < unixepoch() THEN unixepoch() ELSE updated_at END,
    updated_by = 'migration-0081'
WHERE priority_source = 'auto'
  AND ticket_id IN (
    SELECT id FROM support_tickets
    WHERE category IN ('rating_problem','pass_problem')
  );

CREATE TABLE IF NOT EXISTS support_known_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  severity TEXT NOT NULL DEFAULT 'normal' CHECK(severity IN ('normal','important','critical')),
  status TEXT NOT NULL DEFAULT 'investigating' CHECK(status IN ('investigating','monitoring','resolved')),
  public INTEGER NOT NULL DEFAULT 1 CHECK(public IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  resolved_at INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_support_known_issues_public_status
ON support_known_issues(public, status, severity, updated_at DESC);

CREATE TABLE IF NOT EXISTS support_known_issue_impacts (
  issue_id INTEGER NOT NULL,
  player_telegram_id TEXT NOT NULL,
  ticket_id INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(issue_id, player_telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_support_known_issue_impacts_issue
ON support_known_issue_impacts(issue_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_known_issue_impacts_player
ON support_known_issue_impacts(player_telegram_id, created_at DESC);
