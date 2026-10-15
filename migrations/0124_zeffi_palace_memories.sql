-- Palace of Memories: community read-only 10-stage landmark. NO contribution route.
-- No changes to Garden/Festival or existing player wallets/cities.
CREATE TABLE IF NOT EXISTS zeffi_world_palace_state (
  id INTEGER PRIMARY KEY CHECK(id=1),
  stage INTEGER NOT NULL DEFAULT 1 CHECK(stage BETWEEN 1 AND 10),
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
  contributions_enabled INTEGER NOT NULL DEFAULT 0 CHECK(contributions_enabled=0),
  last_request_id TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO zeffi_world_palace_state(id,stage,revision,contributions_enabled)
  VALUES (1,1,0,0);
CREATE TABLE IF NOT EXISTS zeffi_world_palace_audit (
  request_id TEXT PRIMARY KEY,
  actor_telegram_id TEXT NOT NULL,
  old_stage INTEGER NOT NULL CHECK(old_stage BETWEEN 1 AND 10),
  new_stage INTEGER NOT NULL CHECK(new_stage BETWEEN 1 AND 10 AND new_stage>=old_stage),
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  revision INTEGER NOT NULL,
  guard INTEGER NOT NULL CHECK(guard=1)
);
