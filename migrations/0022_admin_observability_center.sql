-- Операционный центр: единая очередь проблем для админ-панели.
CREATE TABLE IF NOT EXISTS admin_operational_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL UNIQUE,
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK(severity IN ('info','warning','high','critical')),
  title TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  source_type TEXT NOT NULL DEFAULT 'system',
  source_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','acknowledged','snoozed','resolved')),
  assigned_to TEXT NOT NULL DEFAULT '',
  assigned_to_name TEXT NOT NULL DEFAULT '',
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  snoozed_until INTEGER NOT NULL DEFAULT 0,
  resolved_at INTEGER NOT NULL DEFAULT 0,
  resolved_by TEXT NOT NULL DEFAULT '',
  resolved_by_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_operational_issues_status
ON admin_operational_issues(status, severity, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_operational_issues_source
ON admin_operational_issues(source_type, source_id, updated_at DESC);
