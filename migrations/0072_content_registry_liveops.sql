-- Unified Live Content registry state.
-- Keeps the existing live_content_release_rules contract intact for backward compatibility.

CREATE TABLE IF NOT EXISTS live_content_release_rules (
  item_kind TEXT NOT NULL,
  item_id TEXT NOT NULL,
  content_season_id TEXT NOT NULL DEFAULT '',
  released INTEGER NOT NULL DEFAULT 0,
  ever_released INTEGER NOT NULL DEFAULT 0,
  destination_type TEXT NOT NULL DEFAULT 'native',
  destination_id TEXT NOT NULL DEFAULT '',
  destination_config_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(item_kind,item_id)
);

CREATE TABLE IF NOT EXISTS live_content_registry_state (
  item_kind TEXT NOT NULL,
  item_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'hidden',
  release_at INTEGER NOT NULL DEFAULT 0,
  routes_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(item_kind,item_id)
);

CREATE INDEX IF NOT EXISTS idx_live_content_registry_schedule
ON live_content_registry_state(status, release_at);

INSERT OR IGNORE INTO live_content_registry_state(
  item_kind,item_id,status,release_at,routes_json,updated_at,updated_by
)
SELECT
  item_kind,
  item_id,
  CASE WHEN released=1 THEN 'open' ELSE 'hidden' END,
  0,
  '{}',
  updated_at,
  updated_by
FROM live_content_release_rules;
